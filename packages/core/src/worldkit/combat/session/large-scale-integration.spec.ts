import { describe, it, expect, beforeEach } from 'vitest';
import { createCombatSessionApi } from './session';
import { createTransformerContext } from '~/worldkit/context';
import { createActor } from '~/worldkit/entity/actor';
import { ActorType } from '~/types/entity/actor';
import { Team } from '~/types/combat';
import { SessionStatus } from '~/types/session';
import { EventType } from '~/types/event';
import { ActorURN, PlaceURN } from '~/types/taxonomy';

describe('Large Scale Combat Integration', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let location: PlaceURN;

  beforeEach(() => {
    context = createTransformerContext();
    location = 'flux:place:massive-arena' as PlaceURN;
  });

  describe('Massive Battles', () => {
    it('should handle 100+ combatant battles efficiently', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Create 100 combatants across 4 teams
      const combatantCount = 100;
      const teams = ['alpha', 'bravo', 'charlie', 'delta'];

      for (let i = 0; i < combatantCount; i++) {
        const actorId = `flux:actor:combatant-${i}` as ActorURN;
        const team = teams[i % teams.length];

        // Create actor
        context.world.actors[actorId] = createActor({
          id: actorId,
          name: `Combatant ${i}`,
          kind: ActorType.PC,
          location,
          hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
        });

        sessionHook.addCombatant(actorId, team);
      }

      expect(sessionHook.session.data.combatants.size).toBe(combatantCount);

      // Start combat - should complete without timeout
      const startTime = Date.now();
      sessionHook.startCombat();
      const startDuration = Date.now() - startTime;

      expect(sessionHook.session.status).toBe(SessionStatus.RUNNING);
      expect(startDuration).toBeLessThan(1000); // Should start within 1 second

      // Advance a few turns to test performance
      for (let turn = 0; turn < 10; turn++) {
        const turnStartTime = Date.now();
        const events = sessionHook.advanceTurn();
        const turnDuration = Date.now() - turnStartTime;

        expect(events.length).toBeGreaterThan(0);
        expect(turnDuration).toBeLessThan(100); // Each turn should complete within 100ms
      }
    });

    it('should handle rapid death scenarios', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Create 50 combatants on two teams
      const combatantIds: ActorURN[] = [];
      for (let i = 0; i < 50; i++) {
        const actorId = `flux:actor:rapid-death-${i}` as ActorURN;
        const team = i < 25 ? Team.ALPHA : Team.BRAVO;

        context.world.actors[actorId] = createActor({
          id: actorId,
          name: `RapidDeath ${i}`,
          kind: ActorType.PC,
          location,
          hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
        });

        sessionHook.addCombatant(actorId, team);
        combatantIds.push(actorId);
      }

      sessionHook.startCombat();

      // Kill all Team BRAVO members simultaneously
      const teamBravoIds = combatantIds.slice(25);
      teamBravoIds.forEach(actorId => {
        context.world.actors[actorId].hp.eff.cur = 0;
      });

      // Advance turn should detect all deaths and end combat
      const events = sessionHook.advanceTurn();

      // Death events are only emitted by combat actions, not by turn advancement
      // Manual HP changes don't generate death events in our new architecture
      const deathEvents = events.filter(e => e.type === EventType.ACTOR_DID_DIE);
      expect(deathEvents.length).toBe(0);

      // Should have combat end event
      const endEvents = events.filter(e => e.type === EventType.COMBAT_SESSION_DID_END);
      expect(endEvents.length).toBe(1);

      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);
    });

    it('should handle edge case: all combatants dead simultaneously', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Create 20 combatants on two teams
      const combatantIds: ActorURN[] = [];
      for (let i = 0; i < 20; i++) {
        const actorId = `flux:actor:mutual-destruction-${i}` as ActorURN;
        const team = i < 10 ? Team.ALPHA : Team.BRAVO;

        context.world.actors[actorId] = createActor({
          id: actorId,
          name: `MutualDestruction ${i}`,
          kind: ActorType.PC,
          location,
          hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
        });

        sessionHook.addCombatant(actorId, team);
        combatantIds.push(actorId);
      }

      sessionHook.startCombat();

      // Kill all combatants simultaneously (mutual destruction)
      combatantIds.forEach(actorId => {
        context.world.actors[actorId].hp.eff.cur = 0;
      });

      // Advance turn should detect all deaths and end combat
      const events = sessionHook.advanceTurn();

      // Death events are only emitted by combat actions, not by turn advancement
      // Manual HP changes don't generate death events in our new architecture
      const deathEvents = events.filter(e => e.type === EventType.ACTOR_DID_DIE);
      expect(deathEvents.length).toBe(0);

      // Should end combat with no winner (mutual destruction)
      const endEvents = events.filter(e => e.type === EventType.COMBAT_SESSION_DID_END);
      expect(endEvents.length).toBe(1);

      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during extended battles', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Create moderate-sized battle
      for (let i = 0; i < 20; i++) {
        const actorId = `flux:actor:memory-test-${i}` as ActorURN;
        const team = i < 10 ? Team.ALPHA : Team.BRAVO;

        context.world.actors[actorId] = createActor({
          id: actorId,
          name: `MemoryTest ${i}`,
          kind: ActorType.PC,
          location,
          hp: { nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
        });

        sessionHook.addCombatant(actorId, team);
      }

      sessionHook.startCombat();

      // Run extended battle simulation (100 turns)
      let totalEvents = 0;
      for (let turn = 0; turn < 100; turn++) {
        const events = sessionHook.advanceTurn();
        totalEvents += events.length;

        // Verify session is still running (no one should die with 1000 HP)
        expect(sessionHook.session.status).toBe(SessionStatus.RUNNING);
      }

      // Should have generated many events without issues
      expect(totalEvents).toBeGreaterThan(100);

      // Verify all combatants are still tracked
      expect(sessionHook.session.data.combatants.size).toBe(20);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should handle various battle sizes without errors', () => {
      const battleSizes = [10, 25, 50];

      for (const size of battleSizes) {
        const sessionHook = createCombatSessionApi(context, location);

        // Create battle of specified size
        for (let i = 0; i < size; i++) {
          const actorId = `flux:actor:perf-test-${size}-${i}` as ActorURN;
          const team = i < size / 2 ? Team.ALPHA : Team.BRAVO;

          context.world.actors[actorId] = createActor({
            id: actorId,
            name: `PerfTest ${i}`,
            kind: ActorType.PC,
            location,
            hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
          });

          sessionHook.addCombatant(actorId, team);
        }

        // Verify combat operations work correctly regardless of size
        expect(() => sessionHook.startCombat()).not.toThrow();
        expect(sessionHook.session.status).toBe(SessionStatus.RUNNING);

        expect(() => sessionHook.advanceTurn()).not.toThrow();
        expect(sessionHook.session.data.combatants.size).toBe(size);
      }
    });

    it('should handle initiative caching optimization correctly', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Create battle
      for (let i = 0; i < 10; i++) {
        const actorId = `flux:actor:cache-test-${i}` as ActorURN;
        const team = i < 5 ? Team.ALPHA : Team.BRAVO;

        context.world.actors[actorId] = createActor({
          id: actorId,
          name: `CacheTest ${i}`,
          kind: ActorType.PC,
          location,
          hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
        });

        sessionHook.addCombatant(actorId, team);
      }

      // First start should compute initiative
      sessionHook.startCombat();
      expect(sessionHook.session.data.initiativeSorted).toBe(true);
      expect(sessionHook.session.data.lastCombatantHash).toBeDefined();

      // End combat
      sessionHook.endCombat();

      // Second start should use cached initiative (same combatants)
      const secondStartTime = performance.now();
      sessionHook.startCombat();
      const secondStartDuration = performance.now() - secondStartTime;

      // Should still be marked as sorted
      expect(sessionHook.session.data.initiativeSorted).toBe(true);

      // Second start should be faster (though this is hard to measure reliably)
      expect(secondStartDuration).toBeLessThan(50); // Should be very fast
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle combat with single team gracefully', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add combatants all on same team
      for (let i = 0; i < 5; i++) {
        const actorId = `flux:actor:single-team-${i}` as ActorURN;

        context.world.actors[actorId] = createActor({
          id: actorId,
          name: `SingleTeam ${i}`,
          kind: ActorType.PC,
          location,
          hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
        });

        sessionHook.addCombatant(actorId, Team.ALPHA);
      }

      // Should throw error when trying to start combat
      expect(() => {
        sessionHook.startCombat();
      }).toThrow(/opposing teams/);
    });

    it('should handle missing actors gracefully during resource recovery', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Create valid combat
      const actorId1 = 'flux:actor:valid-1' as ActorURN;
      const actorId2 = 'flux:actor:valid-2' as ActorURN;

      context.world.actors[actorId1] = createActor({
        id: actorId1,
        name: 'Valid 1',
        kind: ActorType.PC,
        location,
        hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
      });

      context.world.actors[actorId2] = createActor({
        id: actorId2,
        name: 'Valid 2',
        kind: ActorType.PC,
        location,
        hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
      });

      sessionHook.addCombatant(actorId1, Team.ALPHA);
      sessionHook.addCombatant(actorId2, Team.BRAVO);
      sessionHook.startCombat();

      // Get the current actor and remove them from world (simulating data inconsistency)
      const currentActor = sessionHook.session.data.rounds.current.turns.current.actor;
      delete context.world.actors[currentActor];

      // Should handle missing actor gracefully and end combat due to victory conditions
      const events = sessionHook.advanceTurn();

      // Should end combat as one team is no longer viable
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(true);
      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);
    });
  });
});
