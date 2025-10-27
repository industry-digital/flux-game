import { describe, it, expect, beforeEach } from 'vitest';
import { createCombatLifecycle } from './combat-lifecycle';
import { createTransformerContext } from '~/worldkit/context';
import { createCombatSession } from './session';
import { createActor } from '~/worldkit/entity/actor';
import { ActorType } from '~/types/entity/actor';
import { Team, CombatFacing } from '~/types/combat';
import { SessionStatus } from '~/types/session';
import { CombatSessionEnded, EventType } from '~/types/event';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { createCombatGameStateApi } from '~/worldkit/combat/session/game-state';

describe('Combat Lifecycle - Termination', () => {
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
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
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
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
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
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
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
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
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
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
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
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
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
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
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
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
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
  });

  describe('endCombat', () => {
    it('should throw error when combat is not running', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [],
      });

      const gameState = createCombatGameStateApi(context, session, location);
      const lifecycle = createCombatLifecycle(context, session, sessionId, location, gameState);

      expect(() => lifecycle.endCombat()).toThrow('Cannot end combat that is not running');
    });

    it('should emit COMBAT_SESSION_DID_END event with winning team', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
            mass: 70,
            ap: { nat: { cur: 6, max: 6 }, eff: { cur: 6, max: 6 }, mods: {} },
            energy: { position: 1, nat: { cur: 1000, max: 1000 }, eff: { cur: 1000, max: 1000 }, mods: {} },
            balance: { nat: { cur: 1, max: 1 }, eff: { cur: 1, max: 1 }, mods: {} },
            target: null,
          },
        ],
      });

      session.status = SessionStatus.RUNNING;
      session.data.currentTurn.round = 3;
      session.data.currentTurn.number = 2;

      const gameState = createCombatGameStateApi(context, session, location);
      const lifecycle = createCombatLifecycle(context, session, sessionId, location, gameState);
      const events = lifecycle.endCombat();

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(EventType.COMBAT_SESSION_STATUS_DID_CHANGE);
      expect(events[1].type).toBe(EventType.COMBAT_SESSION_DID_END);

      const event = events[1] as CombatSessionEnded;

      expect(event.payload.sessionId).toBe(sessionId);
      expect(event.payload.winningTeam).toBe(Team.ALPHA); // Only Alice remains viable
      expect(event.payload.finalRound).toBe(3);
      expect(event.payload.finalTurn).toBe(2);
    });

    it('should emit COMBAT_SESSION_DID_END event with null winning team for mutual destruction', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
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
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
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

      session.status = SessionStatus.RUNNING;
      const gameState = createCombatGameStateApi(context, session, location);
      const lifecycle = createCombatLifecycle(context, session, sessionId, location, gameState);
      const events = lifecycle.endCombat();

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(EventType.COMBAT_SESSION_STATUS_DID_CHANGE);
      const event = events[1] as CombatSessionEnded;
      expect(event.type).toBe(EventType.COMBAT_SESSION_DID_END);
      expect(event.payload.winningTeam).toBeNull();
    });

    it('should set session status to TERMINATED', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [],
      });

      session.status = SessionStatus.RUNNING;
      const gameState = createCombatGameStateApi(context, session, location);
      const lifecycle = createCombatLifecycle(context, session, sessionId, location, gameState);
      lifecycle.endCombat();

      expect(session.status).toBe(SessionStatus.TERMINATED);
    });
  });
});
