import { describe, it, expect, beforeEach } from 'vitest';
import { createCombatGameStateApi } from './game-state';
import { createTransformerContext } from '~/worldkit/context';
import { createCombatSession } from './session';
import { createActor } from '~/worldkit/entity/actor';
import { ActorType } from '~/types/entity/actor';
import { Team, CombatFacing } from '~/types/combat';
import { CombatantDidDie, EventType } from '~/types/event';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';

describe('createCombatGameStateApi', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let sessionId: SessionURN;
  let location: PlaceURN;

  const ALICE_ID: ActorURN = 'flux:actor:alice' as ActorURN;
  const BOB_ID: ActorURN = 'flux:actor:bob' as ActorURN;
  const CHARLIE_ID: ActorURN = 'flux:actor:charlie' as ActorURN;

  beforeEach(() => {
    context = createTransformerContext();
    sessionId = 'flux:session:combat:test' as SessionURN;
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
  });

  describe('checkVictoryConditions', () => {
    it('should return false when no combatants exist in pending session', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Session is PENDING, so no victory conditions to check
      expect(gameState.checkVictoryConditions()).toBe(false);
    });

    it('should return false when multiple teams have viable combatants', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', mods: {}, natural: 12 },
            mass: 75,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      expect(gameState.checkVictoryConditions()).toBe(false);
    });

    it('should return true when only one team has viable combatants', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', mods: {}, natural: 12 },
            mass: 75,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      // Kill Bob (Team Bravo)
      context.world.actors[BOB_ID].hp.eff.cur = 0;

      const gameState = createCombatGameStateApi(context, session, location);

      expect(gameState.checkVictoryConditions()).toBe(true);
    });

    it('should return true when no teams have viable combatants (mutual destruction)', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', mods: {}, natural: 12 },
            mass: 75,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      // Kill both combatants
      context.world.actors[ALICE_ID].hp.eff.cur = 0;
      context.world.actors[BOB_ID].hp.eff.cur = 0;

      const gameState = createCombatGameStateApi(context, session, location);

      expect(gameState.checkVictoryConditions()).toBe(true);
    });

    it('should detect fleeing as inability to continue fighting', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', mods: {}, natural: 12 },
            mass: 75,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      // Bob flees (changes location)
      context.world.actors[BOB_ID].location = 'flux:place:elsewhere' as PlaceURN;

      const gameState = createCombatGameStateApi(context, session, location);

      expect(gameState.checkVictoryConditions()).toBe(true);
    });

    it('should handle multiple combatants on same team', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
          {
            actorId: CHARLIE_ID,
            team: Team.ALPHA,
            position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [10], result: 10, dice: '1d20', mods: {}, natural: 10 },
            mass: 80,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', mods: {}, natural: 12 },
            mass: 75,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Initially, both teams viable
      expect(gameState.checkVictoryConditions()).toBe(false);

      // Kill one member of Team Alpha - team should still be viable
      context.world.actors[CHARLIE_ID].hp.eff.cur = 0;
      expect(gameState.checkVictoryConditions()).toBe(false);

      // Kill remaining member of Team Alpha - Team Bravo wins
      context.world.actors[ALICE_ID].hp.eff.cur = 0;
      expect(gameState.checkVictoryConditions()).toBe(true);
    });
  });

  describe('checkForDeaths', () => {
    it('should return empty array when no combatants have died', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      const deathEvents = gameState.checkForDeaths();
      expect(deathEvents).toHaveLength(0);
    });

    it('should emit COMBATANT_DID_DIE event when combatant dies', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // First check - no deaths
      expect(gameState.checkForDeaths()).toHaveLength(0);

      // Kill Alice
      context.world.actors[ALICE_ID].hp.eff.cur = 0;

      // Second check - should detect death
      const deathEvents: CombatantDidDie[] = gameState.checkForDeaths();
      expect(deathEvents).toHaveLength(1);
      expect(deathEvents[0].type).toBe(EventType.COMBATANT_DID_DIE);
      expect(deathEvents[0].payload.actor).toBe(ALICE_ID);

      // Third check - should not emit duplicate death event
      expect(gameState.checkForDeaths()).toHaveLength(0);
    });

    it('should emit multiple death events when multiple combatants die', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', mods: {}, natural: 12 },
            mass: 75,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Kill both combatants simultaneously
      context.world.actors[ALICE_ID].hp.eff.cur = 0;
      context.world.actors[BOB_ID].hp.eff.cur = 0;

      const deathEvents = gameState.checkForDeaths();
      expect(deathEvents).toHaveLength(2);

      const actorIds = deathEvents.map(event => event.payload.actor);
      expect(actorIds).toContain(ALICE_ID);
      expect(actorIds).toContain(BOB_ID);

      deathEvents.forEach(event => {
        expect(event.type).toBe(EventType.COMBATANT_DID_DIE);
      });
    });

    it('should handle resurrection correctly', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Kill Alice
      context.world.actors[ALICE_ID].hp.eff.cur = 0;
      expect(gameState.checkForDeaths()).toHaveLength(1);

      // Resurrect Alice
      context.world.actors[ALICE_ID].hp.eff.cur = 50;
      expect(gameState.checkForDeaths()).toHaveLength(0);

      // Kill Alice again - should emit another death event
      context.world.actors[ALICE_ID].hp.eff.cur = 0;
      expect(gameState.checkForDeaths()).toHaveLength(1);
    });

    it('should declare events through context', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', mods: {}, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Initially no events
      expect(context.getDeclaredEvents()).toHaveLength(0);

      // Kill Alice
      context.world.actors[ALICE_ID].hp.eff.cur = 0;
      gameState.checkForDeaths();

      // Should have declared the death event
      const declaredEvents = context.getDeclaredEvents();
      expect(declaredEvents).toHaveLength(1);
      expect(declaredEvents[0].type).toBe(EventType.COMBATANT_DID_DIE);
    });
  });
});
