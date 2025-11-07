#!/usr/bin/env tsx

import { parseEntityType, createEntityUrn } from './taxonomy';
import { EntityType } from '~/types/entity/entity';
import { EntityURN } from '~/types/taxonomy';

interface BenchmarkResult {
  function: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  opsPerSecond: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

function benchmarkParseEntityType(): BenchmarkResult {
  const testUrns: EntityURN[] = [
    'flux:place:nightcity',
    'flux:actor:pc:123',
    'flux:group:party:adventurers',
    'flux:session:combat:123',
    'flux:place:city:tokyo:district:shibuya',
    'flux:actor:monster:goblin:elite:boss',
    'flux:group:guild:thieves:elite',
    'flux:session:trade:market:auction',
  ];

  const iterations = 10_000;
  const warmupIterations = 1_000;

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    for (const urn of testUrns) {
      parseEntityType(urn);
    }
  }

  // Actual benchmark
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    for (const urn of testUrns) {
      parseEntityType(urn);
    }
  }

  const end = performance.now();
  const totalTime = end - start;
  const totalOps = iterations * testUrns.length;

  return {
    function: 'parseEntityType',
    iterations: totalOps,
    totalTime,
    averageTime: totalTime / totalOps,
    opsPerSecond: totalOps / (totalTime / 1000)
  };
}

function benchmarkCreateEntityUrn(): BenchmarkResult {
  const testCases = [
    { type: EntityType.PLACE, terms: ['nightcity'] },
    { type: EntityType.ACTOR, terms: ['pc', '123'] },
    { type: EntityType.GROUP, terms: ['party', 'adventurers'] },
    { type: EntityType.SESSION, terms: ['combat', '123'] },
    { type: EntityType.PLACE, terms: ['city', 'tokyo', 'district', 'shibuya'] },
    { type: EntityType.ACTOR, terms: ['monster', 'goblin', 'elite', 'boss'] },
    { type: EntityType.GROUP, terms: ['guild', 'thieves', 'elite'] },
    { type: EntityType.SESSION, terms: ['trade', 'market', 'auction'] },
  ];

  const iterations = 10_000;
  const warmupIterations = 1_000;

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    for (const testCase of testCases) {
      createEntityUrn(testCase.type, ...testCase.terms);
    }
  }

  // Actual benchmark
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    for (const testCase of testCases) {
      createEntityUrn(testCase.type, ...testCase.terms);
    }
  }

  const end = performance.now();
  const totalTime = end - start;
  const totalOps = iterations * testCases.length;

  return {
    function: 'createEntityUrn',
    iterations: totalOps,
    totalTime,
    averageTime: totalTime / totalOps,
    opsPerSecond: totalOps / (totalTime / 1000)
  };
}

function benchmarkCreateEntityUrnVariations(): BenchmarkResult {
  const iterations = 10_000;
  const warmupIterations = 1_000;

  // Test different term counts
  const testCases = [
    // Single term
    () => createEntityUrn(EntityType.PLACE, 'home'),
    // Two terms
    () => createEntityUrn(EntityType.ACTOR, 'pc', '123'),
    // Three terms
    () => createEntityUrn(EntityType.GROUP, 'party', 'heroes', 'elite'),
    // Many terms
    () => createEntityUrn(EntityType.SESSION, 'combat', 'arena', 'tournament', 'final', 'round'),
  ];

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    for (const testCase of testCases) {
      testCase();
    }
  }

  // Actual benchmark
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    for (const testCase of testCases) {
      testCase();
    }
  }

  const end = performance.now();
  const totalTime = end - start;
  const totalOps = iterations * testCases.length;

  return {
    function: 'createEntityUrn (variations)',
    iterations: totalOps,
    totalTime,
    averageTime: totalTime / totalOps,
    opsPerSecond: totalOps / (totalTime / 1000)
  };
}

function runBenchmarks() {
  console.log('🚀 Taxonomy Function Benchmarks\n');
  console.log('Running 10,000 iterations after warmup...\n');

  const results = [
    benchmarkParseEntityType(),
    benchmarkCreateEntityUrn(),
    benchmarkCreateEntityUrnVariations(),
  ];

  console.log('📊 Results:');
  console.log('─'.repeat(80));

  results.forEach(result => {
    console.log(`${result.function}:`);
    console.log(`  Operations: ${formatNumber(result.iterations)}`);
    console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`  Throughput: ${formatNumber(result.opsPerSecond)} ops/sec`);
    console.log(`  Avg time:   ${(result.averageTime * 1000).toFixed(3)}μs per operation`);
    console.log('');
  });

  // Performance comparison
  const parseResult = results[0];
  const createResult = results[1];

  console.log('🏆 Performance Comparison:');
  console.log('─'.repeat(80));

  if (parseResult.opsPerSecond > createResult.opsPerSecond) {
    const ratio = (parseResult.opsPerSecond / createResult.opsPerSecond).toFixed(1);
    console.log(`parseEntityType is ${ratio}x faster than createEntityUrn`);
  } else {
    const ratio = (createResult.opsPerSecond / parseResult.opsPerSecond).toFixed(1);
    console.log(`createEntityUrn is ${ratio}x faster than parseEntityType`);
  }

  console.log(`parseEntityType: ${formatNumber(parseResult.opsPerSecond)} ops/sec`);
  console.log(`createEntityUrn:  ${formatNumber(createResult.opsPerSecond)} ops/sec`);
}

if (require.main === module) {
  runBenchmarks();
}
