/**
 * Performance benchmark for BattlefieldNotation optimizations
 *
 * This benchmark demonstrates the performance improvements achieved by:
 * 1. Single-pass algorithm instead of multiple passes
 * 2. O(1) boundary lookups using Set instead of O(n) array.find()
 * 3. Inline processing instead of intermediate data structures
 * 4. Zero-copy iteration patterns
 */

import { renderBattlefieldNotation, ColorStrategies } from './BattlefieldNotation';
import type { NotationActor } from '~/types/combat';

/**
 * Generate test data for benchmarking
 */
function generateTestActors(count: number): NotationActor[] {
  const actors: NotationActor[] = [];
  const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry'];
  const teams = ['alpha', 'bravo', 'charlie'];
  const facings: ('left' | 'right')[] = ['left', 'right'];

  for (let i = 0; i < count; i++) {
    actors.push({
      id: `actor-${i}`,
      name: names[i % names.length] + i.toString(),
      team: teams[i % teams.length],
      position: Math.floor(Math.random() * 300),
      facing: facings[i % facings.length],
    });
  }

  return actors;
}

/**
 * Benchmark the optimized implementation
 */
function benchmarkNotationRendering() {
  const testSizes = [10, 50, 100, 500, 1000];

  console.log('🏁 BattlefieldNotation Performance Benchmark');
  console.log('==========================================');

  for (const size of testSizes) {
    const actors = generateTestActors(size);
    const boundaries = [
      { position: 0, side: 'left' as const },
      { position: 300, side: 'right' as const },
    ];

    // Warm up
    for (let i = 0; i < 10; i++) {
      renderBattlefieldNotation({
        combatants: actors,
        boundaries,
        colorStrategy: ColorStrategies.PLAIN,
        subjectTeam: 'alpha',
        currentActor: actors[0]?.id,
      });
    }

    // Benchmark
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      renderBattlefieldNotation({
        combatants: actors,
        boundaries,
        colorStrategy: ColorStrategies.PLAIN,
        subjectTeam: 'alpha',
        currentActor: actors[Math.floor(Math.random() * actors.length)]?.id,
      });
    }

    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / iterations;

    console.log(`${size.toString().padStart(4)} actors: ${avgTime.toFixed(3)}ms avg (${iterations} iterations)`);
  }

  console.log('\n✨ Optimizations Applied:');
  console.log('• Single-pass algorithm (O(n) instead of O(n²))');
  console.log('• Set-based boundary lookups (O(1) instead of O(n))');
  console.log('• Inline processing (reduced memory allocations)');
  console.log('• Zero-copy iteration patterns');
}

// Export for manual testing
export { benchmarkNotationRendering, generateTestActors };
