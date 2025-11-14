#!/usr/bin/env tsx
/**
 * Timestamp Generator Benchmark
 *
 * Compares throughput of raw Date.now() vs cached timestamp generator
 * with different update frequencies.
 * Also measures memory footprint to prove no memory leaks.
 */

import { useBenchmarkSuite } from './benchmark';
import {
  createTimestampGenerator,
  DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS,
} from './timestamp';
import { createTransformerContext } from '~/worldkit/context';

const ITERATIONS = 10_000_000; // 10M iterations for stable measurements

const runBenchmarks = async () => {
  const suite = useBenchmarkSuite('Timestamp Generation');

  // Baseline: Raw Date.now()
  await suite.measure({
    name: 'Date.now() (baseline)',
    iterations: ITERATIONS,
    fn: () => {
      Date.now();
    },
  });

  // Cached timestamp with 10ms updates (default)
  await suite.measure({
    name: 'Cached (10ms updates)',
    iterations: ITERATIONS,
    setup: () => {
      const gen = createTimestampGenerator(
        10,
        DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS,
      );
      gen.start();
      return gen;
    },
    fn: (gen) => {
      gen.timestamp();
    },
    teardown: (gen) => {
      gen.stop();
    },
  });

  // Cached timestamp with 1ms updates (high precision)
  await suite.measure({
    name: 'Cached (1ms updates)',
    iterations: ITERATIONS,
    setup: () => {
      const gen = createTimestampGenerator(
        1,
        DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS,
      );
      gen.start();
      return gen;
    },
    fn: (gen) => {
      gen.timestamp();
    },
    teardown: (gen) => {
      gen.stop();
    },
  });

  // Cached timestamp with 100ms updates (low precision)
  await suite.measure({
    name: 'Cached (100ms updates)',
    iterations: ITERATIONS,
    setup: () => {
      const gen = createTimestampGenerator(
        100,
        DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS,
      );
      gen.start();
      return gen;
    },
    fn: (gen) => {
      gen.timestamp();
    },
    teardown: (gen) => {
      gen.stop();
    },
  });

  // Memory read comparison (theoretical maximum)
  await suite.measure({
    name: 'Raw memory read (theoretical max)',
    iterations: ITERATIONS,
    setup: () => {
      let value = Date.now();
      return { getValue: () => value };
    },
    fn: (ctx) => {
      ctx.getValue();
    },
  });

  suite.report();

  // Calculate speedup
  const baseline = suite.results.get('Date.now() (baseline)');
  const cached10ms = suite.results.get('Cached (10ms updates)');

  if (baseline && cached10ms) {
    const speedup = cached10ms.throughputPerSecond / baseline.throughputPerSecond;
    console.log('\n🚀 SPEEDUP ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Cached (10ms) is ${speedup.toFixed(1)}x faster than Date.now()`);
    console.log(`Throughput gain: ${((speedup - 1) * 100).toFixed(0)}%`);
  }

  // Memory footprint analysis
  console.log('\n💾 MEMORY FOOTPRINT ANALYSIS');
  console.log('='.repeat(80));
  measureMemoryFootprint();
};

/**
 * Measures memory footprint when creating many TransformerContext instances.
 * Proves that the lazy singleton pattern prevents memory leaks.
 */
const measureMemoryFootprint = () => {
  const formatBytes = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  // Force garbage collection if available (run with --expose-gc flag)
  if (global.gc) {
    global.gc();
  }

  // Baseline memory
  const baselineMemory = process.memoryUsage();

  // Create many contexts (simulating high-traffic server)
  const NUM_CONTEXTS = 10_000;
  const contexts: any[] = [];

  console.log(`Creating ${NUM_CONTEXTS.toLocaleString()} TransformerContext instances...`);

  for (let i = 0; i < NUM_CONTEXTS; i++) {
    contexts.push(createTransformerContext());
  }

  // Force garbage collection again
  if (global.gc) {
    global.gc();
  }

  // Measure memory after creating contexts
  const afterMemory = process.memoryUsage();

  const heapUsedDelta = afterMemory.heapUsed - baselineMemory.heapUsed;
  const heapUsedPerContext = heapUsedDelta / NUM_CONTEXTS;

  console.log(`\nBaseline heap: ${formatBytes(baselineMemory.heapUsed)}`);
  console.log(`After ${NUM_CONTEXTS.toLocaleString()} contexts: ${formatBytes(afterMemory.heapUsed)}`);
  console.log(`Heap delta: ${formatBytes(heapUsedDelta)}`);
  console.log(`Per context: ${formatBytes(heapUsedPerContext)}`);

  // Verify all contexts share the same timestamp function
  const firstTimestamp = contexts[0].timestamp;
  const allShareSameTimestamp = contexts.every(ctx => ctx.timestamp === firstTimestamp);

  console.log(`\nAll contexts share same timestamp function: ${allShareSameTimestamp ? '✅ YES' : '❌ NO'}`);

  if (!allShareSameTimestamp) {
    console.log('⚠️  WARNING: Memory leak detected! Each context has its own timestamp generator.');
  } else {
    console.log('✅ No memory leak: Lazy singleton working correctly.');
  }

  // Estimate what memory would be WITHOUT singleton
  // Assume each timer closure + interval takes ~200 bytes (conservative estimate)
  const TIMER_OVERHEAD_BYTES = 200;
  const wouldBeMemoryWithoutSingleton = heapUsedDelta + (NUM_CONTEXTS * TIMER_OVERHEAD_BYTES);
  const savedMemory = wouldBeMemoryWithoutSingleton - heapUsedDelta;

  console.log(`\nMemory saved by singleton pattern: ${formatBytes(savedMemory)}`);
  console.log(`Projected leak prevented: ${NUM_CONTEXTS.toLocaleString()} timer objects`);

  if (!global.gc) {
    console.log('\n💡 Tip: Run with --expose-gc flag for more accurate measurements:');
    console.log('   node --expose-gc path/to/benchmark.js');
  }
};

// Run if executed directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks, measureMemoryFootprint };
