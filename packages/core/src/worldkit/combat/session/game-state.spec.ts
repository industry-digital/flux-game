import { describe, it, expect, beforeEach } from 'vitest';
import { createCombatGameStateApi } from './game-state';
import { createTransformerContext } from '~/worldkit/context';
import { createCombatSession } from './session';
import { setCurrentHp } from '~/worldkit/entity/actor';
import { Actor } from '~/types/entity/actor';
import { Team, CombatFacing } from '~/types/combat';
import { PlaceURN, SessionURN } from '~/types/taxonomy';
import { ALICE_ID, BOB_ID, CHARLIE_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { createDefaultActors } from '~/testing/actors';

describe('createCombatGameStateApi', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let scenario: WorldScenarioHook;
  let sessionId: SessionURN;
  let location: PlaceURN;
  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;

  beforeEach(() => {
    context = createTransformerContext();
    scenario = createWorldScenario(context);

    sessionId = 'flux:session:combat:test' as SessionURN;
    location = DEFAULT_LOCATION;

    ({ alice, bob, charlie } = createDefaultActors());

    scenario.addActor(alice);
    scenario.addActor(bob);
    scenario.addActor(charlie);

    alice.location = location;
    bob.location = location;
    charlie.location = location;
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
            ap: { current: 6, max: 6 },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
            ap: { current: 6, max: 6 },
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
            ap: { current: 6, max: 6 },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
            ap: { current: 6, max: 6 },
            target: null,
          },
        ],
      });

      // Kill Bob (Team Bravo)
      setCurrentHp(context.world.actors[BOB_ID], 0);

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
            ap: { current: 6, max: 6 },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
            ap: { current: 6, max: 6 },
            target: null,
          },
        ],
      });

      // Kill both combatants
      setCurrentHp(alice, 0);
      setCurrentHp(bob, 0);

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
            ap: { current: 6, max: 6 },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
            ap: { current: 6, max: 6 },
            target: null,
          },
        ],
      });

      // Bob flees (changes location)
      bob.location = 'flux:place:elsewhere' as PlaceURN;

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
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
            ap: { current: 6, max: 6 },
            target: null,
          },
          {
            actorId: CHARLIE_ID,
            team: Team.ALPHA,
            position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [10], result: 10, dice: '1d20', bonus: 0, natural: 10 },
            ap: { current: 6, max: 6 },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
            ap: { current: 6, max: 6 },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Initially, both teams viable
      expect(gameState.checkVictoryConditions()).toBe(false);

      // Kill one member of Team Alpha - team should still be viable
      setCurrentHp(charlie, 0);
      expect(gameState.checkVictoryConditions()).toBe(false);

      // Kill remaining member of Team Alpha - Team Bravo wins
      setCurrentHp(alice, 0);
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
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
            ap: { current: 6, max: 6 },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      const deadActors = gameState.checkForDeaths();
      expect(deadActors).toHaveLength(0);
    });

    it('should detect when combatant dies', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
            ap: { current: 6, max: 6 },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // First check - no deaths
      expect(gameState.checkForDeaths()).toHaveLength(0);

      // Kill Alice
      setCurrentHp(alice, 0);

      // Second check - should detect death
      const deadActors = gameState.checkForDeaths();
      expect(deadActors).toHaveLength(1);
      expect(deadActors[0]).toBe(ALICE_ID);

      // Third check - should not detect duplicate death
      expect(gameState.checkForDeaths()).toHaveLength(0);
    });

    it('should detect multiple deaths when multiple combatants die', () => {
      const session = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [
          {
            actorId: ALICE_ID,
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
            ap: { current: 6, max: 6 },
            target: null,
          },
          {
            actorId: BOB_ID,
            team: Team.BRAVO,
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 },
            initiative: { values: [12], result: 12, dice: '1d20', bonus: 0, natural: 12 },
            ap: { current: 6, max: 6 },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Kill both combatants simultaneously
      setCurrentHp(alice, 0);
      setCurrentHp(bob, 0);

      const deadActors = gameState.checkForDeaths();
      expect(deadActors).toHaveLength(2);
      expect(deadActors).toContain(ALICE_ID);
      expect(deadActors).toContain(BOB_ID);
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
            initiative: { values: [15], result: 15, dice: '1d20', bonus: 0, natural: 15 },
            ap: { current: 6, max: 6 },
            target: null,
          },
        ],
      });

      const gameState = createCombatGameStateApi(context, session, location);

      // Kill Alice
      setCurrentHp(alice, 0);
      expect(gameState.checkForDeaths()).toHaveLength(1);

      // Resurrect Alice
      setCurrentHp(alice, 50);
      expect(gameState.checkForDeaths()).toHaveLength(0);

      // Kill Alice again - should detect another death
      setCurrentHp(alice, 0);
      expect(gameState.checkForDeaths()).toHaveLength(1);
    });

  });
});
