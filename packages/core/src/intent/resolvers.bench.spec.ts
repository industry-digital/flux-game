import { describe, it } from 'vitest';
import { createEntityResolverApi } from './resolvers';
import { createBenchmarkWorld, createTestIntent, measureThroughput } from './testing';

describe('Entity Resolver Benchmarks', () => {
  const worldSizes = [100, 500, 1000, 2000, 5000];

  worldSizes.forEach(size => {
    it(`should benchmark ${size} actors`, () => {
      const { world, sampleActor, sampleLocation } = createBenchmarkWorld(size);
      const resolverApi = createEntityResolverApi(world);

      const intents = [
        createTestIntent('attack knight', sampleActor, sampleLocation),
        createTestIntent('talk to wizard', sampleActor, sampleLocation),
        createTestIntent('look at swift', sampleActor, sampleLocation),
        createTestIntent('cast spell on mighty', sampleActor, sampleLocation),
        createTestIntent('quickly strike the ancient paladin', sampleActor, sampleLocation),
      ];

      const metrics = measureThroughput(resolverApi, intents, 100);

      console.log(`${size} actors: ${metrics.opsPerSecond.toFixed(0)} ops/sec, ${metrics.avgLatencyMs.toFixed(3)}ms avg latency`);
    });
  });

  it('should benchmark initialization overhead', () => {
    const worldSizes = [100, 500, 1000, 2000];

    console.log('\n=== Initialization Overhead ===');

    for (const size of worldSizes) {
      const { world } = createBenchmarkWorld(size);

      const startTime = performance.now();
      createEntityResolverApi(world);
      const endTime = performance.now();

      const initTime = endTime - startTime;
      console.log(`${size} actors: ${initTime.toFixed(2)}ms initialization`);
    }
  });

  it('should benchmark your 1000-intent batch scenario', () => {
    const { world, sampleActor, sampleLocation } = createBenchmarkWorld(1000);
    const resolverApi = createEntityResolverApi(world);

    const intents = [
      createTestIntent('attack knight', sampleActor, sampleLocation),
      createTestIntent('talk to wizard', sampleActor, sampleLocation),
      createTestIntent('look at archer', sampleActor, sampleLocation),
      createTestIntent('cast spell on rogue', sampleActor, sampleLocation),
    ];

    console.log('\n=== 1000-Intent Batch Simulation ===');

    const startTime = performance.now();

    // Simulate your 1000-intent batch
    for (let i = 0; i < 1000; i++) {
      const intent = intents[i % intents.length];
      resolverApi.resolveActor(intent);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`1000 intents processed in ${totalTime.toFixed(2)}ms`);
    console.log(`Average: ${(totalTime / 1000).toFixed(3)}ms per intent`);
    console.log(`Throughput: ${((1000 / totalTime) * 1000).toFixed(0)} intents/sec`);
  });

  it('should benchmark different world sizes for scaling analysis', () => {
    console.log('\n=== Scaling Analysis ===');

    const sizes = [100, 500, 1000, 2000, 5000];

    for (const size of sizes) {
      const { world, sampleActor, sampleLocation } = createBenchmarkWorld(size);
      const resolverApi = createEntityResolverApi(world);

      const intents = [
        createTestIntent('attack knight', sampleActor, sampleLocation),
        createTestIntent('talk to wizard', sampleActor, sampleLocation),
      ];

      const metrics = measureThroughput(resolverApi, intents, 50);

      console.log(`${size.toString().padStart(4)} actors: ${metrics.opsPerSecond.toFixed(0).padStart(6)} ops/sec, ${metrics.avgLatencyMs.toFixed(3).padStart(6)}ms latency`);
    }
  });

  it('should profile memory utilization of trie-based resolver', () => {
    console.log('\n=== Memory Utilization Analysis ===');

    const sizes = [100, 500, 1000, 2000, 5000];

    for (const size of sizes) {
      // Force garbage collection before measurement (if available)
      if (global.gc) {
        global.gc();
      }

      const memBefore = process.memoryUsage();

      // Create world and resolver
      const { world } = createBenchmarkWorld(size);
      const resolverApi = createEntityResolverApi(world);

      // Force another GC to get accurate measurement
      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage();

      // Calculate memory usage
      const heapUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024; // MB
      const heapTotal = (memAfter.heapTotal - memBefore.heapTotal) / 1024 / 1024; // MB
      const external = (memAfter.external - memBefore.external) / 1024 / 1024; // MB

      // Calculate memory per actor
      const memoryPerActor = (heapUsed * 1024) / size; // KB per actor

      console.log(`${size.toString().padStart(4)} actors: ${heapUsed.toFixed(2).padStart(6)}MB heap, ${memoryPerActor.toFixed(2).padStart(6)}KB/actor`);

      // Test a few operations to ensure resolver is working
      const testIntent = createTestIntent('attack knight', Object.keys(world.actors)[0] as any, Object.keys(world.places)[0] as any);
      resolverApi.resolveActor(testIntent);
    }
  });

  it('should compare memory efficiency vs naive approaches', () => {
    console.log('\n=== Memory Efficiency Comparison ===');

    const size = 1000;
    const { world } = createBenchmarkWorld(size);

    // Measure trie-based resolver
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage();

    const resolverApi = createEntityResolverApi(world);

    if (global.gc) global.gc();
    const memAfter = process.memoryUsage();

    const trieMemory = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

    // Simulate naive approach memory usage
    const actors = Object.values(world.actors);
    const naiveMemoryEstimate = actors.reduce((total, actor) => {
      // Estimate: actor name + lowercased copy + array entry overhead
      return total + (actor.name.length * 2) + 64; // bytes
    }, 0) / 1024 / 1024; // Convert to MB

    // Calculate trie efficiency
    const efficiency = ((naiveMemoryEstimate - trieMemory) / naiveMemoryEstimate * 100);

    console.log(`Trie-based resolver: ${trieMemory.toFixed(2)}MB`);
    console.log(`Naive approach (est): ${naiveMemoryEstimate.toFixed(2)}MB`);
    console.log(`Memory efficiency: ${efficiency > 0 ? '+' : ''}${efficiency.toFixed(1)}% ${efficiency > 0 ? 'savings' : 'overhead'}`);

    // Memory density analysis
    const avgNameLength = actors.reduce((sum, actor) => sum + actor.name.length, 0) / actors.length;
    const memoryPerChar = (trieMemory * 1024 * 1024) / (actors.length * avgNameLength); // bytes per character

    console.log(`Average name length: ${avgNameLength.toFixed(1)} chars`);
    console.log(`Memory density: ${memoryPerChar.toFixed(2)} bytes/char in trie`);
  });

  it('should analyze memory allocation patterns during resolution', () => {
    console.log('\n=== Memory Allocation During Resolution ===');

    const { world, sampleActor, sampleLocation } = createBenchmarkWorld(1000);
    const resolverApi = createEntityResolverApi(world);

    const intents = [
      createTestIntent('attack knight', sampleActor, sampleLocation),
      createTestIntent('talk to wizard', sampleActor, sampleLocation),
      createTestIntent('look at swift', sampleActor, sampleLocation),
    ];

    // Measure memory during resolution operations
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage();

    // Perform many resolution operations
    for (let i = 0; i < 1000; i++) {
      const intent = intents[i % intents.length];
      resolverApi.resolveActor(intent);
    }

    if (global.gc) global.gc();
    const memAfter = process.memoryUsage();

    const allocationDelta = (memAfter.heapUsed - memBefore.heapUsed) / 1024; // KB
    const allocationsPerOp = allocationDelta / 1000; // KB per operation

    console.log(`1000 resolution operations:`);
    console.log(`Total allocation delta: ${allocationDelta.toFixed(2)}KB`);
    console.log(`Allocation per operation: ${allocationsPerOp.toFixed(4)}KB`);
    console.log(`Zero-copy efficiency: ${allocationsPerOp < 0.1 ? '✅ Excellent' : allocationsPerOp < 1 ? '✅ Good' : '⚠️ Could improve'}`);
  });
});
