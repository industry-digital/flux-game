import { describe, it, expect, beforeEach } from 'vitest';
import { createCombatSessionApi } from './session';
import { createTransformerContext } from '~/worldkit/context';
import { createActor } from '~/worldkit/entity/actor';
import { ActorType } from '~/types/entity/actor';
import { Team } from '~/types/combat';
import { SessionStatus } from '~/types/session';
import { ActorDidDie, CombatSessionEnded, EventType, WorldEvent } from '~/types/event';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { extractFirstEventOfType } from '~/testing/event';
import { createActorDidDieEvent } from '~/testing/event/factory/combat';

const extractTerminationEvent = (events: WorldEvent[]): CombatSessionEnded => {
  const terminationEvent = events.find(e => e.type === EventType.COMBAT_SESSION_DID_END) as CombatSessionEnded;
  if (!terminationEvent) {
    expect.fail('No termination event found');
  }
  return terminationEvent;
};

describe('Combat Session - Termination Integration', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let location: PlaceURN;

  const ALICE_ID: ActorURN = 'flux:actor:alice' as ActorURN;
  const BOB_ID: ActorURN = 'flux:actor:bob' as ActorURN;
  const CHARLIE_ID: ActorURN = 'flux:actor:charlie' as ActorURN;
  const DAVE_ID: ActorURN = 'flux:actor:dave' as ActorURN;

  beforeEach(() => {
    context = createTransformerContext();
    location = 'flux:place:arena' as PlaceURN;

    // Create test actors
    context.world.actors[ALICE_ID] = createActor({
      id: ALICE_ID,
      name: 'Alice',
      kind: ActorType.PC,
      location,
      hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
    });

    context.world.actors[BOB_ID] = createActor({
      id: BOB_ID,
      name: 'Bob',
      kind: ActorType.PC,
      location,
      hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
    });

    context.world.actors[CHARLIE_ID] = createActor({
      id: CHARLIE_ID,
      name: 'Charlie',
      kind: ActorType.PC,
      location,
      hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
    });

    context.world.actors[DAVE_ID] = createActor({
      id: DAVE_ID,
      name: 'Dave',
      kind: ActorType.PC,
      location,
      hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} },
    });
  });

  describe('advanceTurn integration', () => {
    it('should advance turn normally when no victory conditions are met', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add combatants from different teams
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');

      sessionHook.startCombat();

      const events = sessionHook.advanceTurn();

      // Should only contain turn advancement events, no termination
      expect(events.some(e => e.type === EventType.COMBAT_TURN_DID_START)).toBe(true);
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(false);
      expect(sessionHook.session.status).toBe(SessionStatus.RUNNING);
    });

    it('should automatically end combat when victory conditions are met after turn advancement', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add combatants from different teams
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');

      sessionHook.startCombat();

      // Kill Bob during the turn (simulating damage)
      context.world.actors[BOB_ID].hp.eff.cur = 0;

      const events = sessionHook.advanceTurn();

      // Should contain both turn advancement and termination events
      expect(events.some(e => e.type === EventType.COMBAT_TURN_DID_START)).toBe(true);
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(true);
      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);

      // Check termination event details
      const terminationEvent = events.find(e => e.type === EventType.COMBAT_SESSION_DID_END) as CombatSessionEnded;
      if (!terminationEvent) {
        expect.fail('No termination event found');
      }

      expect(terminationEvent.payload.winningTeam).toBe('alpha');
    });

    it('should terminate combat based on HP without death events from manual HP changes', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add combatants from different teams
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');

      sessionHook.startCombat();

      // Kill Bob manually (simulating external damage, not from STRIKE)
      context.world.actors[BOB_ID].hp.eff.cur = 0;

      const events = sessionHook.advanceTurn();

      // Should NOT contain death event (only STRIKE actions emit death events)
      const deathEvent = events.find(e => e.type === EventType.ACTOR_DID_DIE);
      expect(deathEvent).toBeUndefined();

      // Should still contain turn advancement and termination events based on HP
      expect(events.some(e => e.type === EventType.COMBAT_TURN_DID_START)).toBe(true);
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(true);
    });

    it('should handle mutual destruction scenario', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add combatants from different teams
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');

      sessionHook.startCombat();

      // Kill both combatants (mutual destruction)
      context.world.actors[ALICE_ID].hp.eff.cur = 0;
      context.world.actors[BOB_ID].hp.eff.cur = 0;

      const events = sessionHook.advanceTurn();

      // Should contain termination event with no winner
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(true);
      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);

      const terminationEvent = extractTerminationEvent(events);
      expect(terminationEvent.payload.winningTeam).toBeNull();
    });

    it('should handle fleeing scenario', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add combatants from different teams
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');

      sessionHook.startCombat();

      // Bob flees the combat location
      context.world.actors[BOB_ID].location = 'flux:place:elsewhere' as PlaceURN;

      const events = sessionHook.advanceTurn();
      const terminationEvent = extractTerminationEvent(events);

      // Should end combat with Alice's team winning
      expect(terminationEvent).toBeDefined();
      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);
      expect(terminationEvent.payload.winningTeam).toBe('alpha');
    });

    it('should continue combat when multiple teams remain viable', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add combatants from three teams
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');
      sessionHook.addCombatant(CHARLIE_ID, 'Team Charlie' as Team);

      sessionHook.startCombat();

      // Kill only one combatant
      context.world.actors[BOB_ID].hp.eff.cur = 0;

      const events = sessionHook.advanceTurn();

      // Should continue combat (Alice and Charlie still viable)
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(false);
      expect(sessionHook.session.status).toBe(SessionStatus.RUNNING);
    });

    it('should continue combat without death events when actors die from manual HP changes', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add multiple combatants from different teams
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(CHARLIE_ID, 'alpha'); // Second Alpha member
      sessionHook.addCombatant(BOB_ID, 'bravo');
      sessionHook.addCombatant(DAVE_ID, 'bravo'); // Second Bravo member

      sessionHook.startCombat();

      // Kill Bob manually but leave Dave alive on Team Bravo (combat should continue)
      context.world.actors[BOB_ID].hp.eff.cur = 0;

      const events = sessionHook.advanceTurn();

      // Should NOT contain death event (only STRIKE actions emit death events)
      const deathEvent = events.find(e => e.type === EventType.ACTOR_DID_DIE);
      expect(deathEvent).toBeUndefined();

      // Should contain turn advancement but NOT termination (combat continues)
      expect(events.some(e => e.type === EventType.COMBAT_TURN_DID_START)).toBe(true);
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(false);
      expect(sessionHook.session.status).toBe(SessionStatus.RUNNING);
    });

    it('should handle death events from external sources and terminate correctly', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add combatants from different teams
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');

      sessionHook.startCombat();

      // Simulate a death event being declared externally (e.g., from combat action)
      // This tests that session termination works regardless of the death event source
      const externalDeathEvent = createActorDidDieEvent((event) => ({
        ...event,
        location,
        actor: BOB_ID,
        trace: 'external-death-test',
        payload: {
          killer: ALICE_ID,
        },
      }));

      // Kill Bob and declare the death event (simulating what a combat action would do)
      context.world.actors[BOB_ID].hp.eff.cur = 0;
      context.declareEvent(externalDeathEvent);

      // Advance turn to trigger victory condition check
      const events = sessionHook.advanceTurn();

      // Should contain termination events (combat should end due to victory)
      const sessionEndedEvent = extractFirstEventOfType<CombatSessionEnded>(events, EventType.COMBAT_SESSION_DID_END);
      expect(sessionEndedEvent).toBeDefined();
      expect(sessionEndedEvent?.payload.winningTeam).toBe('alpha');

      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);

      // The externally declared death event should be in the context's event log
      const actorDidDieEvent = extractFirstEventOfType<ActorDidDie>(context.getDeclaredEvents(), EventType.ACTOR_DID_DIE);
      expect(actorDidDieEvent).toBeDefined();
      expect(actorDidDieEvent?.payload.killer).toBe(ALICE_ID);
    });
  });

  describe('manual termination methods', () => {
    it('should expose checkVictoryConditions method', () => {
      const sessionHook = createCombatSessionApi(context, location);

      expect(typeof sessionHook.checkVictoryConditions).toBe('function');
      expect(sessionHook.checkVictoryConditions()).toBe(false); // No combat running
    });

    it('should expose endCombat method', () => {
      const sessionHook = createCombatSessionApi(context, location);

      expect(typeof sessionHook.endCombat).toBe('function');
    });

    it('should allow manual combat termination', () => {
      const sessionHook = createCombatSessionApi(context, location);

      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');
      sessionHook.startCombat();

      // Manually end combat
      const events = sessionHook.endCombat();

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(EventType.COMBAT_SESSION_STATUS_DID_CHANGE);
      expect(events[1].type).toBe(EventType.COMBAT_SESSION_DID_END);
      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);
    });
  });

  describe('edge cases', () => {
    it('should handle actor not found scenario', () => {
      const sessionHook = createCombatSessionApi(context, location);

      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');
      sessionHook.startCombat();

      // Remove Bob from world (simulating actor deletion)
      delete context.world.actors[BOB_ID];

      const events = sessionHook.advanceTurn();

      // Should end combat as Bob is no longer viable
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(true);
      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);

      const terminationEvent = extractTerminationEvent(events);
      expect(terminationEvent.payload.winningTeam).toBe('alpha');
    });

    it('should not terminate already terminated combat', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Need at least two combatants from different teams to start combat
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');
      sessionHook.startCombat();

      // Manually terminate
      sessionHook.endCombat();
      expect(sessionHook.session.status).toBe(SessionStatus.TERMINATED);

      // Try to advance turn on terminated combat
      const events = sessionHook.advanceTurn();

      // Should only contain turn events, no additional termination
      expect(events.filter(e => e.type === EventType.COMBAT_SESSION_DID_END)).toHaveLength(0);
    });

    it('should handle same team multiple combatants correctly', () => {
      const sessionHook = createCombatSessionApi(context, location);

      // Add multiple combatants to same team
      sessionHook.addCombatant(ALICE_ID, 'alpha');
      sessionHook.addCombatant(CHARLIE_ID, 'alpha');
      sessionHook.addCombatant(BOB_ID, 'bravo');

      sessionHook.startCombat();

      // Kill one member of Team Alpha
      context.world.actors[ALICE_ID].hp.eff.cur = 0;

      const events = sessionHook.advanceTurn();

      // Should continue combat (Charlie still alive on Team Alpha)
      expect(events.some(e => e.type === EventType.COMBAT_SESSION_DID_END)).toBe(false);
      expect(sessionHook.session.status).toBe(SessionStatus.RUNNING);

      // Kill remaining Team Alpha member
      context.world.actors[CHARLIE_ID].hp.eff.cur = 0;

      const events2 = sessionHook.advanceTurn();
      const terminationEvent2 = extractTerminationEvent(events2);
      // Now should end combat
      expect(terminationEvent2.payload.winningTeam).toBe('bravo');
    });
  });
});
