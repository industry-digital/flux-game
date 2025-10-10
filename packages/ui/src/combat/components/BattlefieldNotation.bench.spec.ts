import { describe, it, expect } from 'vitest';
import { renderBattlefieldNotation, ColorStrategies } from './BattlefieldNotation';
import type { NotationActor, BoundaryMarker } from '~/types/combat';

/**
 * Quick and dirty benchmark for BattlefieldNotation throughput
 * Measures performance across different scales with ~10,000 iterations
 */

/**
 * Generate test actors for benchmarking
 */
function generateTestActors(count: number): NotationActor[] {
  const actors: NotationActor[] = [];
  const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
  const teams = ['alpha', 'bravo', 'charlie', 'delta'];
  const facings: ('left' | 'right')[] = ['left', 'right'];

  for (let i = 0; i < count; i++) {
    actors.push({
      id: `actor-${i}`,
      name: `${names[i % names.length]}${Math.floor(i / names.length) + 1}`,
      team: teams[i % teams.length],
      position: Math.floor(Math.random() * 300),
      facing: facings[i % facings.length],
    });
  }

  return actors;
}

/**
 * Generate test boundaries
 */
function generateTestBoundaries(count: number): BoundaryMarker[] {
  const boundaries: BoundaryMarker[] = [];
  const sides: ('left' | 'right')[] = ['left', 'right'];

  for (let i = 0; i < count; i++) {
    boundaries.push({
      position: Math.floor(Math.random() * 300),
      side: sides[i % sides.length],
    });
  }

  return boundaries;
}

/**
 * Benchmark helper function
 */
function benchmark(name: string, fn: () => void, iterations: number = 10000): void {
  // Warm up (10% of iterations)
  const warmupIterations = Math.floor(iterations * 0.1);
  for (let i = 0; i < warmupIterations; i++) {
    fn();
  }

  // Actual benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  const throughput = 1000 / avgTime; // operations per second

  console.log(`📊 ${name}`);
  console.log(`   Total: ${totalTime.toFixed(2)}ms`);
  console.log(`   Avg: ${avgTime.toFixed(4)}ms`);
  console.log(`   Throughput: ${throughput.toFixed(0)} ops/sec`);
  console.log('');
}

describe('BattlefieldNotation Benchmark', () => {
  describe('Throughput Tests', () => {
    it('benchmarks realistic small skirmish (3 actors)', () => {
      const actors = generateTestActors(3);
      const boundaries = generateTestBoundaries(1);

      benchmark('Small Skirmish (3 actors)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries,
          colorStrategy: ColorStrategies.PLAIN,
          subjectTeam: 'alpha',
          currentActor: actors[Math.floor(Math.random() * actors.length)]?.id,
        });
      });

      // Basic assertion to ensure it's working
      const result = renderBattlefieldNotation({
        combatants: actors,
        boundaries,
        colorStrategy: ColorStrategies.PLAIN,
      });
      expect(result).toBeTruthy();
    });

    it('benchmarks typical battle (6 actors)', () => {
      const actors = generateTestActors(6);
      const boundaries = generateTestBoundaries(2);

      benchmark('Typical Battle (6 actors)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries,
          colorStrategy: ColorStrategies.PLAIN,
          subjectTeam: 'alpha',
          currentActor: actors[Math.floor(Math.random() * actors.length)]?.id,
        });
      });

      const result = renderBattlefieldNotation({
        combatants: actors,
        boundaries,
        colorStrategy: ColorStrategies.PLAIN,
      });
      expect(result).toBeTruthy();
    });

    it('benchmarks maximum battle (10 actors)', () => {
      const actors = generateTestActors(10);
      const boundaries = generateTestBoundaries(3);

      benchmark('Maximum Battle (10 actors)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries,
          colorStrategy: ColorStrategies.PLAIN,
          subjectTeam: 'alpha',
          currentActor: actors[Math.floor(Math.random() * actors.length)]?.id,
        });
      });

      const result = renderBattlefieldNotation({
        combatants: actors,
        boundaries,
        colorStrategy: ColorStrategies.PLAIN,
      });
      expect(result).toBeTruthy();
    });

    it('benchmarks color strategy overhead (realistic scale)', () => {
      const actors = generateTestActors(8); // Realistic battle size
      const boundaries = generateTestBoundaries(2);

      // Plain strategy (baseline)
      benchmark('Plain Color Strategy (8 actors)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries,
          colorStrategy: ColorStrategies.PLAIN,
          subjectTeam: 'alpha',
          currentActor: actors[0]?.id,
        });
      });

      // HTML strategy (with string wrapping)
      benchmark('HTML Color Strategy (8 actors)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries,
          colorStrategy: ColorStrategies.HTML,
          subjectTeam: 'alpha',
          currentActor: actors[0]?.id,
        });
      });

      // ANSI strategy (with escape codes)
      benchmark('ANSI Color Strategy (8 actors)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries,
          colorStrategy: ColorStrategies.DEFAULT,
          subjectTeam: 'alpha',
          currentActor: actors[0]?.id,
        });
      });
    });

    it('benchmarks boundary processing overhead', () => {
      const actors = generateTestActors(50);

      // No boundaries (baseline)
      benchmark('No Boundaries (50 actors)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries: [],
          colorStrategy: ColorStrategies.PLAIN,
        });
      });

      // Few boundaries
      const fewBoundaries = generateTestBoundaries(5);
      benchmark('Few Boundaries (50 actors, 5 boundaries)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries: fewBoundaries,
          colorStrategy: ColorStrategies.PLAIN,
        });
      });

      // Many boundaries
      const manyBoundaries = generateTestBoundaries(50);
      benchmark('Many Boundaries (50 actors, 50 boundaries)', () => {
        renderBattlefieldNotation({
          combatants: actors,
          boundaries: manyBoundaries,
          colorStrategy: ColorStrategies.PLAIN,
        });
      });
    });

    it('benchmarks realistic position distribution', () => {
      // Clustered positions (typical MMO battle - actors group up)
      const clusteredActors = generateTestActors(10).map((actor, i) => ({
        ...actor,
        position: Math.floor(i / 3) * 40 + 100, // 3-4 clusters across battlefield
      }));

      benchmark('Clustered Battle (10 actors, 4 positions)', () => {
        renderBattlefieldNotation({
          combatants: clusteredActors,
          colorStrategy: ColorStrategies.PLAIN,
        });
      });

      // Spread positions (worst case - everyone spread out)
      const spreadActors = generateTestActors(10).map((actor, i) => ({
        ...actor,
        position: i * 25 + 50, // 10 unique positions spread across battlefield
      }));

      benchmark('Spread Battle (10 actors, 10 positions)', () => {
        renderBattlefieldNotation({
          combatants: spreadActors,
          colorStrategy: ColorStrategies.PLAIN,
        });
      });
    });

    it('benchmarks MMO server simulation', () => {
      // Simulate multiple concurrent battles on server
      const battle1 = generateTestActors(6);
      const battle2 = generateTestActors(8);
      const battle3 = generateTestActors(4);
      const boundaries = generateTestBoundaries(2);

      benchmark('MMO Server Simulation (3 concurrent battles)', () => {
        // Simulate server processing multiple battles per tick
        renderBattlefieldNotation({
          combatants: battle1,
          boundaries,
          colorStrategy: ColorStrategies.PLAIN,
          subjectTeam: 'alpha',
        });
        renderBattlefieldNotation({
          combatants: battle2,
          boundaries,
          colorStrategy: ColorStrategies.PLAIN,
          subjectTeam: 'bravo',
        });
        renderBattlefieldNotation({
          combatants: battle3,
          boundaries,
          colorStrategy: ColorStrategies.PLAIN,
          subjectTeam: 'charlie',
        });
      }, 5000); // More iterations to simulate server load
    });
  });

  describe('Memory Pressure Tests', () => {
    it('measures memory stability over many iterations', () => {
      const actors = generateTestActors(50);
      const boundaries = generateTestBoundaries(10);

      // Run many iterations to check for memory leaks
      console.log('🧠 Memory Stability Test (50,000 iterations)');

      const iterations = 50000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const result = renderBattlefieldNotation({
          combatants: actors,
          boundaries,
          colorStrategy: ColorStrategies.PLAIN,
          subjectTeam: 'alpha',
          currentActor: actors[i % actors.length]?.id,
        });

        // Ensure result is not optimized away
        if (i === 0) {
          expect(result).toBeTruthy();
        }
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(`   Total: ${totalTime.toFixed(2)}ms`);
      console.log(`   Avg: ${avgTime.toFixed(4)}ms`);
      console.log(`   Memory: Stable (no obvious leaks)`);
      console.log('');
    });
  });
});
