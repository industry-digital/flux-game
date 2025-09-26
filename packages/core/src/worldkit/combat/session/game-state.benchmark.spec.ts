/**
 * Performance benchmarks for useCombatGameState hook
 *
 * Tests various scenarios to understand performance characteristics:
 * - Scaling with combatant count
 * - Death detection performance
 * - Victory condition checking
 * - Memory allocation patterns
 */

import { describe, it, beforeEach } from 'vitest';
import { createCombatGameStateApi } from './game-state';
import { createTransformerContext } from '~/worldkit/context';
import { createCombatSession } from './session';
import { createActor } from '~/worldkit/entity/actor';
import { ActorType } from '~/types/entity/actor';
import { Team, CombatFacing } from '~/types/combat';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';

/**
 * Benchmark utility for measuring performance
 */
function benchmark(name: string, iterations: number, fn: () => void): number {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`${name}: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(4)}ms avg (${iterations} iterations)`);
  return avgTime;
}

/**
 * Create test combatants for benchmarking
 */
function createTestCombatants(count: number, context: ReturnType<typeof createTransformerContext>, location: PlaceURN) {
  const combatants = [];

  for (let i = 0; i < count; i++) {
    const actorId = `flux:actor:test-${i}` as ActorURN;
    const team = i % 2 === 0 ? Team.ALPHA : Team.BRAVO;

    // Create actor in world
    context.world.actors[actorId] = createActor({
      id: actorId,
      name: `TestActor${i}`,
      kind: ActorType.PC,
      location,
      hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
    });

    // Create combatant data
    combatants.push({
      actorId,
      team,
      position: { coordinate: 100 + i * 10, facing: CombatFacing.RIGHT, speed: 0 },
      initiative: { values: [15], result: 15, dice: '1d20' as const, mods: {}, natural: 15 },
      mass: 70,
      ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
      energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
      balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
      target: null,
    });
  }

  return combatants;
}

describe('useCombatGameState Performance Benchmarks', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let location: PlaceURN;
  let sessionId: SessionURN;

  beforeEach(() => {
    context = createTransformerContext();
    location = 'flux:place:arena' as PlaceURN;
    sessionId = 'flux:session:combat:test' as SessionURN;
  });

  describe('Scaling Benchmarks', () => {
    it('should benchmark checkVictoryConditions with varying combatant counts', () => {
      const sizes = [10, 50, 100, 500, 1000];

      console.log('\n=== Victory Condition Checking Performance ===');

      for (const size of sizes) {
        const combatants = createTestCombatants(size, context, location);
        const session = createCombatSession(context, {
          id: sessionId,
          location,
          combatants,
        });

        const gameState = createCombatGameStateApi(context, session, location);

        benchmark(
          `checkVictoryConditions (${size} combatants)`,
          100, // Reduced from 1000
          () => gameState.checkVictoryConditions()
        );
      }
    });

    it('should benchmark checkForDeaths with varying combatant counts', () => {
      const sizes = [10, 50, 100, 500, 1000];

      console.log('\n=== Death Detection Performance ===');

      for (const size of sizes) {
        const combatants = createTestCombatants(size, context, location);
        const session = createCombatSession(context, {
          id: sessionId,
          location,
          combatants,
        });

        const gameState = createCombatGameStateApi(context, session, location);

        benchmark(
          `checkForDeaths (${size} combatants, no deaths)`,
          100, // Reduced from 1000
          () => gameState.checkForDeaths()
        );
      }
    });
  });

  describe('Death Detection Benchmarks', () => {
    it('should benchmark death detection with varying death counts', () => {
      const totalCombatants = 100;
      const deathCounts = [0, 1, 5, 10, 25, 50];

      console.log('\n=== Death Detection with Varying Death Counts ===');

      for (const deathCount of deathCounts) {
        const combatants = createTestCombatants(totalCombatants, context, location);
        const session = createCombatSession(context, {
          id: sessionId,
          location,
          combatants,
        });

        // Kill specified number of actors
        for (let i = 0; i < deathCount; i++) {
          const actorId = `flux:actor:test-${i}` as ActorURN;
          context.world.actors[actorId].hp.eff.cur = 0;
        }

        const gameState = createCombatGameStateApi(context, session, location);

        // First call to initialize state
        gameState.checkForDeaths();

        // Reset actors to alive for consistent benchmarking
        for (let i = 0; i < deathCount; i++) {
          const actorId = `flux:actor:test-${i}` as ActorURN;
          context.world.actors[actorId].hp.eff.cur = 100;
        }

        // Kill them again for the benchmark
        for (let i = 0; i < deathCount; i++) {
          const actorId = `flux:actor:test-${i}` as ActorURN;
          context.world.actors[actorId].hp.eff.cur = 0;
        }

        benchmark(
          `checkForDeaths (${deathCount} deaths out of ${totalCombatants})`,
          100,
          () => {
            // Reset state for each iteration
            for (let i = 0; i < deathCount; i++) {
              const actorId = `flux:actor:test-${i}` as ActorURN;
              context.world.actors[actorId].hp.eff.cur = 100;
            }

            // Create fresh game state to reset tracking
            const freshGameState = createCombatGameStateApi(context, session, location);

            // Kill actors
            for (let i = 0; i < deathCount; i++) {
              const actorId = `flux:actor:test-${i}` as ActorURN;
              context.world.actors[actorId].hp.eff.cur = 0;
            }

            freshGameState.checkForDeaths();
          }
        );
      }
    });
  });

  describe('Memory Allocation Benchmarks', () => {
    it('should benchmark memory allocation patterns', () => {
      const combatants = createTestCombatants(100, context, location);
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants,
      });

      console.log('\n=== Memory Allocation Patterns ===');

      // Benchmark hook creation
      benchmark(
        'useCombatGameState hook creation',
        100, // Reduced from 1000
        () => {
          createCombatGameStateApi(context, session, location);
        }
      );

      const gameState = createCombatGameStateApi(context, session, location);

      // Benchmark repeated calls (should reuse state)
      benchmark(
        'checkVictoryConditions (repeated calls)',
        1000, // Reduced from 10000
        () => gameState.checkVictoryConditions()
      );

      benchmark(
        'checkForDeaths (repeated calls, no changes)',
        1000, // Reduced from 10000
        () => gameState.checkForDeaths()
      );
    });
  });

  describe('Worst Case Scenarios', () => {
    it('should benchmark worst-case performance scenarios', () => {
      console.log('\n=== Worst Case Scenarios ===');

      // Large number of combatants with frequent deaths
      const largeCombatants = createTestCombatants(1000, context, location);
      const largeSession = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: largeCombatants,
      });

      const largeGameState = createCombatGameStateApi(context, largeSession, location);

      // Simulate alternating life/death states (worst case for state tracking)
      benchmark(
        'Alternating life/death states (1000 combatants)',
        10,
        () => {
          // Kill all
          for (let i = 0; i < 1000; i++) {
            const actorId = `flux:actor:test-${i}` as ActorURN;
            context.world.actors[actorId].hp.eff.cur = 0;
          }
          largeGameState.checkForDeaths();

          // Revive all
          for (let i = 0; i < 1000; i++) {
            const actorId = `flux:actor:test-${i}` as ActorURN;
            context.world.actors[actorId].hp.eff.cur = 100;
          }
          largeGameState.checkForDeaths();
        }
      );

      // Many teams scenario (worst case for victory conditions)
      const manyTeamsCombatants = [];
      for (let i = 0; i < 100; i++) {
        const actorId = `flux:actor:team-${i}` as ActorURN;
        const team = `team-${i}` as Team; // Each combatant on different team

        context.world.actors[actorId] = createActor({
          id: actorId,
          name: `TeamActor${i}`,
          kind: ActorType.PC,
          location,
          hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
        });

        manyTeamsCombatants.push({
          actorId,
          team,
          position: { coordinate: 100 + i * 10, facing: CombatFacing.RIGHT, speed: 0 },
          initiative: { values: [15], result: 15, dice: '1d20' as const, mods: {}, natural: 15 },
          mass: 70,
          ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
          energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
          balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
          target: null,
        });
      }

      const manyTeamsSession = createCombatSession(context, {
        id: 'flux:session:combat:many-teams' as SessionURN,
        location,
        combatants: manyTeamsCombatants,
      });

      const manyTeamsGameState = createCombatGameStateApi(context, manyTeamsSession, location);

      benchmark(
        'checkVictoryConditions (100 different teams)',
        1000,
        () => manyTeamsGameState.checkVictoryConditions()
      );
    });
  });

  describe('Small Battlefield Throughput', () => {
    it('should benchmark typical 6-combatant battlefield throughput', () => {
      console.log('\n=== 6-Combatant Battlefield Throughput ===');

      // Create a typical small party vs small party scenario (3v3)
      const combatants = createTestCombatants(6, context, location);
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants,
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // High-iteration throughput test for small battlefields
      const throughputIterations = 1000; // Reduced for reasonable test runtime

      console.log('Testing common small battlefield operations...');

      // 1. Death detection throughput
      const deathThroughput = benchmark(
        'checkForDeaths (6 combatants, high throughput)',
        throughputIterations,
        () => gameState.checkForDeaths()
      );

      // 2. Victory condition throughput
      const victoryThroughput = benchmark(
        'checkVictoryConditions (6 combatants, high throughput)',
        throughputIterations,
        () => gameState.checkVictoryConditions()
      );

      // 3. Combined operations (simulating per-turn checks)
      const combinedThroughput = benchmark(
        'Combined death+victory checks (6 combatants)',
        throughputIterations,
        () => {
          gameState.checkForDeaths();
          gameState.checkVictoryConditions();
        }
      );

      // Calculate operations per second
      const deathOpsPerSec = Math.round(1000 / deathThroughput);
      const victoryOpsPerSec = Math.round(1000 / victoryThroughput);
      const combinedOpsPerSec = Math.round(1000 / combinedThroughput);

      console.log('\n--- Throughput Analysis ---');
      console.log(`Death detection: ${deathOpsPerSec.toLocaleString()} ops/sec`);
      console.log(`Victory conditions: ${victoryOpsPerSec.toLocaleString()} ops/sec`);
      console.log(`Combined checks: ${combinedOpsPerSec.toLocaleString()} ops/sec`);

      // Simulate realistic combat scenarios
      console.log('\n--- Realistic Combat Scenarios ---');

      // Scenario 1: One combatant dies
      context.world.actors['flux:actor:test-0' as ActorURN].hp.eff.cur = 0;

      benchmark(
        'Death detection (1 death out of 6)',
        1000, // Reduced from 10000
        () => {
          // Reset state for consistent measurement
          const freshGameState = createCombatGameStateApi(context, session, location);
          freshGameState.checkForDeaths();
        }
      );

      // Reset for next test
      context.world.actors['flux:actor:test-0' as ActorURN].hp.eff.cur = 100;

      // Scenario 2: Victory condition met (one team eliminated)
      context.world.actors['flux:actor:test-1' as ActorURN].hp.eff.cur = 0;
      context.world.actors['flux:actor:test-3' as ActorURN].hp.eff.cur = 0;
      context.world.actors['flux:actor:test-5' as ActorURN].hp.eff.cur = 0;

      benchmark(
        'Victory condition check (Team Alpha wins)',
        5000, // Reduced from 50000
        () => gameState.checkVictoryConditions()
      );

      // Reset
      context.world.actors['flux:actor:test-1' as ActorURN].hp.eff.cur = 100;
      context.world.actors['flux:actor:test-3' as ActorURN].hp.eff.cur = 100;
      context.world.actors['flux:actor:test-5' as ActorURN].hp.eff.cur = 100;

      // Scenario 3: Turn-by-turn simulation
      console.log('\n--- Turn Simulation ---');
      let turnCount = 0;

      const avgTurnTime = benchmark(
        'Full turn processing (6 combatants)',
        100, // Reduced from 1000
        () => {
          // Simulate a complete turn cycle
          for (let i = 0; i < 6; i++) {
            const actorId = `flux:actor:test-${i}` as ActorURN;

            // Simulate turn start checks
            gameState.checkForDeaths();
            gameState.checkVictoryConditions();

            // Simulate end of turn recovery
            gameState.handleEndOfTurn(actorId);

            turnCount++;
          }
        }
      );

      // Calculate actual turns per second based on timing
      // avgTurnTime is per iteration (6 turns), so divide by 6 to get per-turn time
      const timePerTurn = avgTurnTime / 6;
      const turnsPerSecond = Math.round(1000 / timePerTurn); // Convert ms to seconds
      console.log(`Turn processing rate: ${turnsPerSecond} turns/sec`);
    });
  });

  describe('Optimization Opportunities', () => {
    it('should identify potential optimization opportunities', () => {
      console.log('\n=== Optimization Analysis ===');

      const combatants = createTestCombatants(100, context, location);
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants,
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Measure individual components
      let actorLookupTime = 0;
      let healthCheckTime = 0;
      let stateTrackingTime = 0;

      const iterations = 1000;

      // Actor lookup performance
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const [actorId] of session.data.combatants) {
          const actor = context.world.actors[actorId];
          // Simulate using the actor
          if (actor) actor.id;
        }
      }
      actorLookupTime = performance.now() - start1;

      // Health check performance
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const [actorId] of session.data.combatants) {
          const actor = context.world.actors[actorId];
          if (actor) {
            const health = actor.hp.eff.cur <= 0; // Simplified health check
          }
        }
      }
      healthCheckTime = performance.now() - start2;

      // State tracking overhead
      const stateMap = new Map<ActorURN, boolean>();
      const start3 = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const [actorId] of session.data.combatants) {
          const wasAlive = stateMap.get(actorId) ?? true;
          const isAlive = true; // Simulate alive state
          stateMap.set(actorId, isAlive);
        }
      }
      stateTrackingTime = performance.now() - start3;

      console.log(`Actor lookups: ${actorLookupTime.toFixed(2)}ms`);
      console.log(`Health checks: ${healthCheckTime.toFixed(2)}ms`);
      console.log(`State tracking: ${stateTrackingTime.toFixed(2)}ms`);
      console.log(`Total overhead: ${(actorLookupTime + healthCheckTime + stateTrackingTime).toFixed(2)}ms`);
    });
  });
});

/**
 * Performance recommendations based on benchmark results:
 *
 * 1. **Actor Lookup Caching**: Consider caching actor references if world.actors lookups are expensive
 * 2. **Batch Health Checks**: If useActorHealth is expensive, consider batching or caching health states
 * 3. **Early Exit Optimizations**: For victory conditions, exit early when finding multiple viable teams
 * 4. **Memory Pool**: For high-frequency death events, consider object pooling for event creation
 * 5. **Incremental Updates**: Track dirty state to avoid unnecessary recalculations
 * 6. **Team Indexing**: Pre-index combatants by team for faster victory condition checks
 */
