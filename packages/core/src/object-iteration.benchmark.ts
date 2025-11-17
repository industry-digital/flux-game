#!/usr/bin/env tsx
/**
 * Benchmark: Direct Object Iteration (for..in) vs Object.keys()
 *
 * Proves that direct `for..in` iteration is faster than `Object.keys()` → array iteration
 * when prototype pollution is not a concern.
 */

import { useBenchmarkSuite } from '~/lib/benchmark';

// Create test objects of various sizes
const createTestObject = (size: number): Record<string, number> => {
  const obj: Record<string, number> = {};
  for (let i = 0; i < size; i++) {
    obj[`key_${i}`] = i;
  }
  return obj;
};

// Direct for..in iteration (what we use)
const iterateWithForIn = (obj: Record<string, number>): number => {
  let sum = 0;
  for (const key in obj) {
    sum += obj[key]!;
  }
  return sum;
};

// Defensive Object.keys() pattern (what we don't use)
const iterateWithObjectKeys = (obj: Record<string, number>): number => {
  let sum = 0;
  for (const key of Object.keys(obj)) {
    sum += obj[key]!;
  }
  return sum;
};

// Object.keys() with forEach (another common pattern)
const iterateWithObjectKeysForEach = (obj: Record<string, number>): number => {
  let sum = 0;
  Object.keys(obj).forEach(key => {
    sum += obj[key]!;
  });
  return sum;
};

// Object.entries() iteration (modern alternative)
const iterateWithObjectEntries = (obj: Record<string, number>): number => {
  let sum = 0;
  for (const [key, value] of Object.entries(obj)) {
    sum += value;
  }
  return sum;
};

async function runBenchmarks() {
  const suite = useBenchmarkSuite('Object Iteration Performance');

  // Test with small objects (typical game state)
  const smallObject = createTestObject(10);
  const mediumObject = createTestObject(100);
  const largeObject = createTestObject(1000);
  const veryLargeObject = createTestObject(10000);

  // Small objects (10 keys) - typical for game entities
  await suite.measure({
    name: 'Small Object (10 keys) - for..in',
    iterations: 1_000_000,
    setup: () => smallObject,
    fn: (obj) => {
      iterateWithForIn(obj);
    },
  });

  await suite.measure({
    name: 'Small Object (10 keys) - Object.keys()',
    iterations: 1_000_000,
    setup: () => smallObject,
    fn: (obj) => {
      iterateWithObjectKeys(obj);
    },
  });

  await suite.measure({
    name: 'Small Object (10 keys) - Object.keys().forEach()',
    iterations: 1_000_000,
    setup: () => smallObject,
    fn: (obj) => {
      iterateWithObjectKeysForEach(obj);
    },
  });

  await suite.measure({
    name: 'Small Object (10 keys) - Object.entries()',
    iterations: 1_000_000,
    setup: () => smallObject,
    fn: (obj) => {
      iterateWithObjectEntries(obj);
    },
  });

  // Medium objects (100 keys) - typical for places with many entities
  await suite.measure({
    name: 'Medium Object (100 keys) - for..in',
    iterations: 100_000,
    setup: () => mediumObject,
    fn: (obj) => {
      iterateWithForIn(obj);
    },
  });

  await suite.measure({
    name: 'Medium Object (100 keys) - Object.keys()',
    iterations: 100_000,
    setup: () => mediumObject,
    fn: (obj) => {
      iterateWithObjectKeys(obj);
    },
  });

  // Large objects (1000 keys) - stress test
  await suite.measure({
    name: 'Large Object (1000 keys) - for..in',
    iterations: 10_000,
    setup: () => largeObject,
    fn: (obj) => {
      iterateWithForIn(obj);
    },
  });

  await suite.measure({
    name: 'Large Object (1000 keys) - Object.keys()',
    iterations: 10_000,
    setup: () => largeObject,
    fn: (obj) => {
      iterateWithObjectKeys(obj);
    },
  });

  // Very large objects (10000 keys) - extreme case
  await suite.measure({
    name: 'Very Large Object (10000 keys) - for..in',
    iterations: 1_000,
    setup: () => veryLargeObject,
    fn: (obj) => {
      iterateWithForIn(obj);
    },
  });

  await suite.measure({
    name: 'Very Large Object (10000 keys) - Object.keys()',
    iterations: 1_000,
    setup: () => veryLargeObject,
    fn: (obj) => {
      iterateWithObjectKeys(obj);
    },
  });

  suite.report();

  // Calculate speedup ratios
  const results = suite.results;
  console.log('\n📈 PERFORMANCE COMPARISON');
  console.log('='.repeat(80));

  const comparisons = [
    { small: 'Small Object (10 keys) - for..in', large: 'Small Object (10 keys) - Object.keys()' },
    { small: 'Medium Object (100 keys) - for..in', large: 'Medium Object (100 keys) - Object.keys()' },
    { small: 'Large Object (1000 keys) - for..in', large: 'Large Object (1000 keys) - Object.keys()' },
    { small: 'Very Large Object (10000 keys) - for..in', large: 'Very Large Object (10000 keys) - Object.keys()' },
  ];

  for (const comp of comparisons) {
    const forInResult = results.get(comp.small);
    const objectKeysResult = results.get(comp.large);

    if (forInResult && objectKeysResult) {
      const forInFaster = forInResult.throughputPerSecond > objectKeysResult.throughputPerSecond;
      const fasterMethod = forInFaster ? forInResult : objectKeysResult;
      const slowerMethod = forInFaster ? objectKeysResult : forInResult;
      const speedup = fasterMethod.throughputPerSecond / slowerMethod.throughputPerSecond;
      const overhead = ((slowerMethod.avgTimePerOp - fasterMethod.avgTimePerOp) / fasterMethod.avgTimePerOp) * 100;

      console.log(`${comp.small.replace(' - for..in', '')}:`);
      console.log(`  for..in:        ${forInResult.throughputPerSecond.toFixed(2)} ops/sec`);
      console.log(`  Object.keys(): ${objectKeysResult.throughputPerSecond.toFixed(2)} ops/sec`);

      if (forInFaster) {
        console.log(`  ✅ for..in is ${speedup.toFixed(2)}x faster`);
        console.log(`  ⚠️  Object.keys() is ${overhead.toFixed(1)}% slower`);
      } else {
        console.log(`  ⚠️  Object.keys() is ${speedup.toFixed(2)}x faster`);
        console.log(`  ✅ for..in is ${overhead.toFixed(1)}% slower`);
      }
      console.log('');
    }
  }
}

// Run benchmarks
runBenchmarks().catch(console.error);
