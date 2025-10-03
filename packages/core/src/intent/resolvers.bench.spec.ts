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
        createTestIntent('attack knight', ['knight'], sampleActor, sampleLocation),
        createTestIntent('talk to wizard', ['wizard'], sampleActor, sampleLocation),
      ];

      const metrics = measureThroughput(resolverApi, intents, 50);

      console.log(`${size.toString().padStart(4)} actors: ${metrics.opsPerSecond.toFixed(0).padStart(6)} ops/sec, ${metrics.avgLatencyMs.toFixed(3).padStart(6)}ms latency`);
    }
  });
});
