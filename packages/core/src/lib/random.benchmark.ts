#!/usr/bin/env tsx
/**
 * Random ID Generator Benchmark
 *
 * Compares throughput of direct crypto calls vs pooled byte generation
 * for ID generation scenarios common in game servers.
 */

import { randomBytes, randomUUID } from 'crypto';
import { useBenchmarkSuite } from './benchmark';
import {
  uniqid,
  createPooledUniqid,
  DirectByteProvider,
  DefaultRandomBytesStrategy,
  BASE36_CHARSET,
  BASE62_CHARSET,
} from './random';

const ITERATIONS = 100_000; // 100K iterations for stable measurements

const runBenchmarks = async () => {
  const suite = useBenchmarkSuite('Random ID Generation');

  console.log('🎲 RANDOM ID GENERATION BENCHMARK');
  console.log('='.repeat(80));
  console.log(`Running ${ITERATIONS.toLocaleString()} iterations per test\n`);

  // Baseline: Direct Node.js crypto.randomBytes for each ID
  await suite.measure({
    name: 'Direct crypto.randomBytes() (baseline)',
    iterations: ITERATIONS,
    fn: () => {
      const bytes = randomBytes(16);
      // Convert to base36 string (similar to uniqid logic)
      let result = '';
      for (let i = 0; i < bytes.length && result.length < 24; i++) {
        const byte = bytes[i];
        if (byte <= 215) { // maxValidValue for base36
          result += BASE36_CHARSET[byte % BASE36_CHARSET.length];
        }
      }
    },
  });

  // UUID v4 comparison (standard library)
  await suite.measure({
    name: 'Node.js randomUUID() (UUID v4)',
    iterations: ITERATIONS,
    fn: () => {
      randomUUID();
    },
  });

  // UUID v4 with hyphen removal (more comparable to uniqid)
  await suite.measure({
    name: 'randomUUID() without hyphens',
    iterations: ITERATIONS,
    fn: () => {
      randomUUID().replace(/-/g, '');
    },
  });

  // Your pooled implementation (default 8KB pool)
  await suite.measure({
    name: 'Pooled uniqid() (8KB pool)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(24, BASE36_CHARSET);
    },
  });

  // Small pool (1KB) - more frequent refills
  await suite.measure({
    name: 'Pooled uniqid() (1KB pool)',
    iterations: ITERATIONS,
    setup: () => createPooledUniqid(1024),
    fn: (generateId) => {
      generateId(24, BASE36_CHARSET);
    },
  });

  // Large pool (32KB) - fewer refills
  await suite.measure({
    name: 'Pooled uniqid() (32KB pool)',
    iterations: ITERATIONS,
    setup: () => createPooledUniqid(32 * 1024),
    fn: (generateId) => {
      generateId(24, BASE36_CHARSET);
    },
  });

  // Direct provider (no pooling)
  await suite.measure({
    name: 'Direct provider (no pooling)',
    iterations: ITERATIONS,
    setup: () => {
      const provider = new DirectByteProvider(new DefaultRandomBytesStrategy());
      return (length: number, charset: string) => {
        const result: string[] = [];
        const maxValidValue = Math.floor(256 / charset.length) * charset.length - 1;

        while (result.length < length) {
          const needed = length - result.length;
          const bytes = provider.getBytes(Math.ceil(needed * 1.3));

          for (const byte of bytes) {
            if (byte <= maxValidValue) {
              result.push(charset[byte % charset.length]);
              if (result.length === length) break;
            }
          }
        }
        return result.join('');
      };
    },
    fn: (generateId) => {
      generateId(24, BASE36_CHARSET);
    },
  });

  console.log('\n🎯 ID LENGTH COMPARISON');
  console.log('='.repeat(80));

  // Short IDs (common for temporary keys)
  await suite.measure({
    name: 'Short IDs (8 chars)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(8, BASE36_CHARSET);
    },
  });

  // Medium IDs (entity URNs)
  await suite.measure({
    name: 'Medium IDs (16 chars)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(16, BASE36_CHARSET);
    },
  });

  // Long IDs (session tokens)
  await suite.measure({
    name: 'Long IDs (32 chars)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(32, BASE62_CHARSET);
    },
  });

  console.log('\n🔤 CHARSET COMPARISON');
  console.log('='.repeat(80));

  // Base36 (XMPP-safe)
  await suite.measure({
    name: 'Base36 charset (36 chars)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(24, BASE36_CHARSET);
    },
  });

  // Base62 (maximum density)
  await suite.measure({
    name: 'Base62 charset (62 chars)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(24, BASE62_CHARSET);
    },
  });

  // Power-of-2 charsets (should be much faster - no rejection sampling)
  await suite.measure({
    name: 'Base32 charset (32 chars, power-of-2)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(24, '0123456789abcdefghijklmnopqrstuv');
    },
  });

  await suite.measure({
    name: 'Base16/Hex charset (16 chars, power-of-2)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(24, '0123456789abcdef');
    },
  });

  // Binary charset (power-of-2, should be very fast)
  await suite.measure({
    name: 'Binary charset (2 chars, power-of-2)',
    iterations: ITERATIONS,
    fn: () => {
      uniqid(24, '01');
    },
  });

  suite.report();

  // Calculate speedup comparisons
  const baseline = suite.results.get('Direct crypto.randomBytes() (baseline)');
  const pooled = suite.results.get('Pooled uniqid() (8KB pool)');
  const uuid = suite.results.get('Node.js randomUUID() (UUID v4)');
  const uuidClean = suite.results.get('randomUUID() without hyphens');

  console.log('\n🚀 SPEEDUP ANALYSIS');
  console.log('='.repeat(80));

  if (baseline && pooled) {
    const speedup = pooled.throughputPerSecond / baseline.throughputPerSecond;
    console.log(`Pooled uniqid vs crypto.randomBytes: ${speedup.toFixed(1)}x faster (${((speedup - 1) * 100).toFixed(0)}% gain)`);
  }

  if (uuid && pooled) {
    const speedup = pooled.throughputPerSecond / uuid.throughputPerSecond;
    console.log(`Pooled uniqid vs UUID v4: ${speedup.toFixed(1)}x faster (${((speedup - 1) * 100).toFixed(0)}% gain)`);
  }

  if (uuidClean && pooled) {
    const speedup = pooled.throughputPerSecond / uuidClean.throughputPerSecond;
    console.log(`Pooled uniqid vs UUID v4 (clean): ${speedup.toFixed(1)}x faster (${((speedup - 1) * 100).toFixed(0)}% gain)`);
  }

  if (pooled) {
    // Project to game server scale
    const idsPerSecond = pooled.throughputPerSecond;
    console.log(`\n🎮 Game Server Projections (pooled uniqid):`);
    console.log(`- ${Math.floor(idsPerSecond).toLocaleString()} IDs/second sustained`);
    console.log(`- ${Math.floor(idsPerSecond * 60).toLocaleString()} IDs/minute`);
    console.log(`- ${Math.floor(idsPerSecond * 3600).toLocaleString()} IDs/hour`);
  }

  // UUID characteristics analysis
  if (uuid) {
    console.log(`\n📊 UUID v4 Characteristics:`);
    console.log(`- Format: 8-4-4-4-12 hexadecimal (36 chars with hyphens)`);
    console.log(`- Entropy: 122 bits (6 bits reserved for version/variant)`);
    console.log(`- Throughput: ${Math.floor(uuid.throughputPerSecond).toLocaleString()} UUIDs/second`);
    console.log(`- Use case: Standards compliance, distributed systems`);
  }

  if (pooled) {
    console.log(`\n🎯 Pooled uniqid Characteristics:`);
    console.log(`- Format: Configurable charset and length`);
    console.log(`- Entropy: ~124 bits (24-char base36) or ~143 bits (24-char base62)`);
    console.log(`- Throughput: ${Math.floor(pooled.throughputPerSecond).toLocaleString()} IDs/second`);
    console.log(`- Use case: High-performance applications, custom requirements`);
  }

  // Memory efficiency analysis
  console.log('\n💾 MEMORY EFFICIENCY ANALYSIS');
  console.log('='.repeat(80));
  measureMemoryEfficiency();

  // Entropy analysis
  console.log('\n🔐 ENTROPY ANALYSIS');
  console.log('='.repeat(80));
  analyzeEntropy();
};

/**
 * Measures memory efficiency of different pool sizes
 */
const measureMemoryEfficiency = () => {
  const formatBytes = (bytes: number): string => {
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const baselineMemory = process.memoryUsage();

  // Create generators with different pool sizes (respecting 64KB Web Crypto limit)
  const generators = [
    { name: '1KB pool', gen: createPooledUniqid(1024) },
    { name: '8KB pool', gen: createPooledUniqid(8 * 1024) },
    { name: '32KB pool', gen: createPooledUniqid(32 * 1024) },
    { name: '64KB pool', gen: createPooledUniqid(64 * 1024) },
  ];

  // Generate many IDs to trigger pool allocations
  generators.forEach(({ name, gen }) => {
    for (let i = 0; i < 1000; i++) {
      gen(24);
    }
  });

  if (global.gc) {
    global.gc();
  }

  const afterMemory = process.memoryUsage();
  const heapDelta = afterMemory.heapUsed - baselineMemory.heapUsed;

  console.log(`Memory overhead for 4 generators: ${formatBytes(heapDelta)}`);
  console.log(`Average per generator: ${formatBytes(heapDelta / 4)}`);

  // Pool size recommendations
  console.log('\n📊 Pool Size Recommendations:');
  console.log('- 1KB: Low memory, frequent refills (good for occasional use)');
  console.log('- 8KB: Balanced (default, good for most applications)');
  console.log('- 32KB: High throughput (good for ID-heavy workloads)');
  console.log('- 64KB: Maximum throughput (Web Crypto API limit)');
};

/**
 * Analyzes entropy characteristics of generated IDs
 */
const analyzeEntropy = () => {
  const sampleSize = 10000;
  const ids = new Set<string>();

  // Generate sample IDs
  for (let i = 0; i < sampleSize; i++) {
    ids.add(uniqid(16, BASE36_CHARSET));
  }

  console.log(`Generated ${sampleSize.toLocaleString()} IDs:`);
  console.log(`- Unique IDs: ${ids.size.toLocaleString()}`);
  console.log(`- Collision rate: ${((1 - ids.size / sampleSize) * 100).toFixed(6)}%`);

  // Calculate theoretical entropy
  const charsetSize = BASE36_CHARSET.length;
  const idLength = 16;
  const theoreticalSpace = Math.pow(charsetSize, idLength);

  console.log(`\nTheoretical analysis (16-char base36):`);
  console.log(`- Charset size: ${charsetSize}`);
  console.log(`- ID space: ${charsetSize}^${idLength} = ${theoreticalSpace.toExponential(2)}`);
  console.log(`- Bits of entropy: ${Math.log2(theoreticalSpace).toFixed(1)} bits`);

  // Birthday paradox analysis
  const birthdayBound = Math.sqrt(Math.PI * theoreticalSpace / 2);
  console.log(`- 50% collision probability at: ${birthdayBound.toExponential(2)} IDs`);

  if (!global.gc) {
    console.log('\n💡 Tip: Run with --expose-gc flag for more accurate memory measurements');
  }
};

// Run if executed directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks, measureMemoryEfficiency, analyzeEntropy };
