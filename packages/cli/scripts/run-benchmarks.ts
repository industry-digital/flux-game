#!/usr/bin/env tsx

/**
 * Benchmark Runner
 *
 * Discovers and runs all *.bench.ts files in the src directory.
 * Provides a unified interface for running custom benchmarks.
 */

import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { pathToFileURL } from 'url';

type BenchmarkFile = {
  path: string;
  relativePath: string;
};

async function findBenchmarkFiles(dir: string, basePath: string = dir): Promise<BenchmarkFile[]> {
  const files: BenchmarkFile[] = [];

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
        // Recursively search subdirectories
        const subFiles = await findBenchmarkFiles(fullPath, basePath);
        files.push(...subFiles);
      } else if (stats.isFile() && entry.endsWith('.bench.ts')) {
        files.push({
          path: fullPath,
          relativePath: relative(basePath, fullPath),
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }

  return files;
}

async function runBenchmarkFile(file: BenchmarkFile): Promise<boolean> {
  console.log(`\n🏃 Running benchmarks: ${file.relativePath}`);
  console.log('='.repeat(60));

  try {
    // Convert file path to file URL for ES module import
    const fileUrl = pathToFileURL(file.path).href;

    // Dynamic import the benchmark file
    const module = await import(fileUrl);

    // Look for common benchmark runner functions
    if (typeof module.runAllBenchmarks === 'function') {
      await module.runAllBenchmarks();
    } else if (typeof module.runBenchmarks === 'function') {
      await module.runBenchmarks();
    } else if (typeof module.default === 'function') {
      await module.default();
    } else {
      console.log('ℹ️  No benchmark runner function found (looking for runAllBenchmarks, runBenchmarks, or default export)');
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Error running benchmarks in ${file.relativePath}:`, error);
    return false;
  }
}

async function main(): Promise<void> {
  const srcDir = join(process.cwd(), 'src');

  console.log('🔍 Discovering benchmark files...');

  const benchmarkFiles = await findBenchmarkFiles(srcDir);

  if (benchmarkFiles.length === 0) {
    console.log('📭 No benchmark files found (*.bench.ts)');
    return;
  }

  console.log(`📊 Found ${benchmarkFiles.length} benchmark file(s):`);
  for (const file of benchmarkFiles) {
    console.log(`  - ${file.relativePath}`);
  }

  let successCount = 0;
  let totalCount = benchmarkFiles.length;

  for (const file of benchmarkFiles) {
    const success = await runBenchmarkFile(file);
    if (success) {
      successCount++;
    }
  }

  console.log('\n📈 BENCHMARK SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);

  if (successCount === totalCount) {
    console.log('\n🎉 All benchmarks completed successfully!');
  } else {
    console.log('\n⚠️  Some benchmarks failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('💥 Benchmark runner failed:', error);
    process.exit(1);
  });
}

export { main as runAllBenchmarks };
