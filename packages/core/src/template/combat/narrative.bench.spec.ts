import { describe, it, beforeEach, vi, expect } from 'vitest';
import { createCombatNarrativeRenderer } from './narrative';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '~/worldkit/combat/testing/schema';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { CombatSessionEnded, CombatSessionStarted, EventType } from '~/types/event';
import { Team } from '~/types/combat';
import { createTestPlace } from '~/testing/world-testing';
import { createDiceRollResult } from '~/worldkit/combat/testing/dice';

describe('Combat Narrative Performance Benchmarks', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let scenario: ReturnType<typeof useCombatScenario>;
  let event: CombatSessionStarted;

  const BATTLEFIELD_ID: PlaceURN = 'flux:place:test:battlefield';
  const ACTORS = {
    ALICE: 'flux:actor:test:alice' as ActorURN,
    BOB: 'flux:actor:test:bob' as ActorURN,
    CHARLIE: 'flux:actor:test:charlie' as ActorURN,
    DAVE: 'flux:actor:test:dave' as ActorURN,
    EVE: 'flux:actor:test:eve' as ActorURN,
    FRANK: 'flux:actor:test:frank' as ActorURN,
  };

  beforeEach(() => {
    context = createTransformerContext();
    context.random = vi.fn().mockReturnValue(0.5);

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:iron-sword',
      name: 'Iron Sword',
    });

    const battlefield = createTestPlace({
      id: BATTLEFIELD_ID,
      name: 'Test Battlefield',
      description: {
        base: 'on a sprawling battlefield with rolling hills and scattered boulders'
      }
    });

    context.world.places[BATTLEFIELD_ID] = battlefield;

    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema]);

    // Create realistic 3v3 scenario for performance testing
    scenario = useCombatScenario(context, {
      location: BATTLEFIELD_ID,
      weapons: [swordSchema],
      schemaManager,
      participants: {
        // Team Alpha (3 players)
        [ACTORS.ALICE]: {
          name: 'Alice the Brave',
          team: Team.ALPHA,
          stats: { pow: 15, fin: 12, per: 14 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 80, facing: 1, speed: 0 },
        },
        [ACTORS.BOB]: {
          name: 'Bob the Bold',
          team: Team.ALPHA,
          stats: { pow: 13, fin: 11, per: 12 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 85, facing: 1, speed: 0 },
        },
        [ACTORS.CHARLIE]: {
          name: 'Charlie the Cunning',
          team: Team.ALPHA,
          stats: { pow: 14, fin: 13, per: 15 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 90, facing: 1, speed: 0 },
        },
        // Team Bravo (3 enemies)
        [ACTORS.DAVE]: {
          name: 'Dave the Dangerous',
          team: Team.BRAVO,
          stats: { pow: 16, fin: 10, per: 13 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 200, facing: -1, speed: 0 },
        },
        [ACTORS.EVE]: {
          name: 'Eve the Elusive',
          team: Team.BRAVO,
          stats: { pow: 12, fin: 16, per: 14 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 205, facing: -1, speed: 0 },
        },
        [ACTORS.FRANK]: {
          name: 'Frank the Fierce',
          team: Team.BRAVO,
          stats: { pow: 17, fin: 9, per: 12 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 210, facing: -1, speed: 0 },
        },
      },
    });

    // Create test event with varied initiative values
    event = {
      id: 'bench-event',
      ts: Date.now(),
      trace: 'bench-trace',
      type: EventType.COMBAT_SESSION_DID_START,
      location: BATTLEFIELD_ID,
      payload: {
        session: scenario.session.id,
        initiative: [
          [ACTORS.ALICE, createDiceRollResult('1d20', [18])],
          [ACTORS.BOB, createDiceRollResult('1d20', [15])],
          [ACTORS.CHARLIE, createDiceRollResult('1d20', [12])],
          [ACTORS.DAVE, createDiceRollResult('1d20', [16])],
          [ACTORS.EVE, createDiceRollResult('1d20', [14])],
          [ACTORS.FRANK, createDiceRollResult('1d20', [10])],
        ],
        combatants: Object.keys(ACTORS).map(key => [
          ACTORS[key as keyof typeof ACTORS],
          scenario.session.data.combatants.get(ACTORS[key as keyof typeof ACTORS])!
        ]),
      },
    } as any;
  });

  describe('Method-Specific Performance Breakdown', () => {
    it('should benchmark renderCombatSessionStarted method', () => {
      const renderer = createCombatNarrativeRenderer(context, scenario.session);

      const iterations = 2000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const actor = Object.values(ACTORS)[i % Object.values(ACTORS).length];
        renderer.renderCombatSessionStarted(event, actor);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(`\n=== renderCombatSessionStarted (FULL) ===`);
      console.log(`Iterations: ${iterations}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time: ${avgTime.toFixed(4)}ms per call`);
      console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} calls/second`);
      console.log(`=========================================\n`);

      expect(avgTime).toBeGreaterThan(0); // Sanity check
    });

    it('should benchmark renderCombatSessionStarted method', () => {
      const renderer = createCombatNarrativeRenderer(context, scenario.session);

      const iterations = 2000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const actor = Object.values(ACTORS)[i % Object.values(ACTORS).length];
        renderer.renderCombatSessionStarted(event, actor);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(`\n=== renderCombatSessionStarted ===`);
      console.log(`Iterations: ${iterations}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time: ${avgTime.toFixed(4)}ms per call`);
      console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} calls/second`);
      console.log(`======================================\n`);

      expect(avgTime).toBeGreaterThan(0); // Sanity check
    });

    it.skip('should benchmark renderCombatSessionStartedMinimal method (not implemented)', () => {
      // This method doesn't exist in the current implementation
      // Skip this test until the method is implemented if needed
    });

    it('should benchmark renderCombatSessionEnded method', () => {
      const renderer = createCombatNarrativeRenderer(context, scenario.session);

      const endEvent: CombatSessionEnded = {
        id: 'bench-end-event',
        ts: Date.now(),
        trace: 'bench-end-trace',
        type: EventType.COMBAT_SESSION_DID_END,
        location: BATTLEFIELD_ID,
        narrative: {
          self: '',
          observer: '',
        },
        payload: {
          sessionId: scenario.session.id,
          winningTeam: Team.ALPHA,
          finalRound: 3,
          finalTurn: 12,
        },
      };

      const iterations = 2000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const actor = Object.values(ACTORS)[i % Object.values(ACTORS).length];
        renderer.renderCombatSessionEnded(endEvent, actor);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(`\n=== renderCombatSessionEnded METHOD ===`);
      console.log(`Iterations: ${iterations}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time: ${avgTime.toFixed(4)}ms per call`);
      console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} calls/second`);
      console.log(`=======================================\n`);

      expect(avgTime).toBeGreaterThan(0); // Sanity check
    });

    it('should compare method performance side-by-side', () => {
      const renderer = createCombatNarrativeRenderer(context, scenario.session);

      const endEvent: CombatSessionEnded = {
        id: 'bench-compare-event',
        ts: Date.now(),
        trace: 'bench-compare-trace',
        type: EventType.COMBAT_SESSION_DID_END,
        location: BATTLEFIELD_ID,
        narrative: {
          self: '',
          observer: '',
        },
        payload: {
          sessionId: scenario.session.id,
          winningTeam: Team.BRAVO,
          finalRound: 2,
          finalTurn: 8,
        },
      };

      const iterations = 1000;
      const actors = Object.values(ACTORS);

      // Benchmark renderCombatSessionStarted
      const startMethodStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const actor = actors[i % actors.length];
        renderer.renderCombatSessionStarted(event, actor);
      }
      const startMethodEnd = performance.now();
      const startMethodTime = startMethodEnd - startMethodStart;

      // Benchmark renderCombatSessionEnded
      const endMethodStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const actor = actors[i % actors.length];
        renderer.renderCombatSessionEnded(endEvent, actor);
      }
      const endMethodEnd = performance.now();
      const endMethodTime = endMethodEnd - endMethodStart;

      const startAvg = startMethodTime / iterations;
      const endAvg = endMethodTime / iterations;
      const speedRatio = startMethodTime / endMethodTime;

      console.log(`\n=== METHOD PERFORMANCE COMPARISON ===`);
      console.log(`renderCombatSessionStarted: ${startMethodTime.toFixed(2)}ms (${startAvg.toFixed(4)}ms avg)`);
      console.log(`renderCombatSessionEnded:   ${endMethodTime.toFixed(2)}ms (${endAvg.toFixed(4)}ms avg)`);
      console.log(`Speed ratio: renderCombatSessionEnded is ${speedRatio.toFixed(2)}x faster`);
      console.log(`Start throughput: ${(iterations / (startMethodTime / 1000)).toFixed(0)} calls/sec`);
      console.log(`End throughput:   ${(iterations / (endMethodTime / 1000)).toFixed(0)} calls/sec`);
      console.log(`======================================\n`);

      expect(startAvg).toBeGreaterThan(0); // Sanity check
      expect(endAvg).toBeGreaterThan(0); // Sanity check
    });
  });

  describe('Narrative Generation Performance', () => {
    it('should benchmark single narrative generation', () => {
      const renderer = createCombatNarrativeRenderer(context, scenario.session);

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        renderer.renderCombatSessionStarted(event, ACTORS.ALICE);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(`\n=== SINGLE NARRATIVE GENERATION ===`);
      console.log(`Iterations: ${iterations}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time: ${avgTime.toFixed(4)}ms per narrative`);
      console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} narratives/second`);
      console.log(`====================================\n`);

      expect(avgTime).toBeGreaterThan(0); // Sanity check
    });

    it('should benchmark cache effectiveness', () => {
      const sharedCache = new Map();
      const renderer = createCombatNarrativeRenderer(context, scenario.session, sharedCache);

      const iterations = 1000;
      const actors = Object.values(ACTORS);

      // Warm up cache
      actors.forEach(actor => {
        renderer.renderCombatSessionStarted(event, actor);
      });

      console.log(`\n=== CACHE EFFECTIVENESS (3v3) ===`);
      console.log(`Cache size after warmup: ${sharedCache.size}`);

      // Benchmark with warm cache
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const actor = actors[i % actors.length];
        renderer.renderCombatSessionStarted(event, actor);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(`Iterations: ${iterations}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time: ${avgTime.toFixed(4)}ms per narrative (cached)`);
      console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} narratives/second`);
      console.log(`===========================\n`);

      expect(avgTime).toBeGreaterThan(0); // Sanity check
    });

    it('should benchmark realistic 3v3 initiative processing', () => {
      const renderer = createCombatNarrativeRenderer(context, scenario.session);

      // Test with the realistic 6-actor scenario
      const iterations = 2000; // More iterations since it's lighter
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const actor = Object.values(ACTORS)[i % Object.values(ACTORS).length];
        renderer.renderCombatSessionStarted(event, actor);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(`\n=== REALISTIC 3v3 INITIATIVE PROCESSING ===`);
      console.log(`Iterations: ${iterations}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time: ${avgTime.toFixed(4)}ms per narrative`);
      console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} narratives/second`);
      console.log(`===========================================\n`);

      expect(avgTime).toBeGreaterThan(0); // Sanity check
    });

    it('should benchmark memory allocation patterns', () => {
      const renderer = createCombatNarrativeRenderer(context, scenario.session);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage();
      const iterations = 10000;

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const actor = Object.values(ACTORS)[i % Object.values(ACTORS).length];
        renderer.renderCombatSessionStarted(event, actor);
      }

      const end = performance.now();
      const finalMemory = process.memoryUsage();

      const totalTime = end - start;
      const avgTime = totalTime / iterations;
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerOp = memoryDelta / iterations;

      console.log(`\n=== MEMORY ALLOCATION PATTERNS ===`);
      console.log(`Iterations: ${iterations}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time: ${avgTime.toFixed(4)}ms per narrative`);
      console.log(`Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory per operation: ${memoryPerOp.toFixed(0)} bytes`);
      console.log(`===================================\n`);

      expect(avgTime).toBeGreaterThan(0); // Sanity check
    });
  });

  describe('Comparative Performance', () => {
    it.skip('should compare all renderCombatSessionStarted variants (variants not implemented)', () => {
      // This test expects Fast and Minimal variants that don't exist in the current implementation
      // Skip this test until the variants are implemented if needed
    });

    it('should compare cache vs no-cache performance', () => {
      const rendererWithCache = createCombatNarrativeRenderer(context, scenario.session, new Map());
      const rendererWithoutCache = createCombatNarrativeRenderer(context, scenario.session, new Map());

      const iterations = 1000;
      const actors = Object.values(ACTORS);

      // Benchmark without cache (fresh cache each time)
      const startNoCache = performance.now();
      for (let i = 0; i < iterations; i++) {
        const freshRenderer = createCombatNarrativeRenderer(context, scenario.session, new Map());
        const actor = actors[i % actors.length];
        freshRenderer.renderCombatSessionStarted(event, actor);
      }
      const endNoCache = performance.now();
      const noCacheTime = endNoCache - startNoCache;

      // Warm up cache
      actors.forEach(actor => {
        rendererWithCache.renderCombatSessionStarted(event, actor);
      });

      // Benchmark with cache
      const startWithCache = performance.now();
      for (let i = 0; i < iterations; i++) {
        const actor = actors[i % actors.length];
        rendererWithCache.renderCombatSessionStarted(event, actor);
      }
      const endWithCache = performance.now();
      const withCacheTime = endWithCache - startWithCache;

      const speedup = noCacheTime / withCacheTime;

      console.log(`\n=== CACHE PERFORMANCE COMPARISON ===`);
      console.log(`No cache: ${noCacheTime.toFixed(2)}ms (${(noCacheTime / iterations).toFixed(4)}ms avg)`);
      console.log(`With cache: ${withCacheTime.toFixed(2)}ms (${(withCacheTime / iterations).toFixed(4)}ms avg)`);
      console.log(`Speedup: ${speedup.toFixed(2)}x faster with cache`);
      console.log(`=====================================\n`);

      expect(speedup).toBeGreaterThan(0); // Sanity check
    });
  });
});
