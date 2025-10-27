import { describe, it, expect, vi } from 'vitest';
import {
  createCombatSession,
  createCombatSessionId,
  getCombatSession,
  createCombatSessionApi,
  type CombatSessionInput,
} from './session';
import { createCombatant, CreateCombatantDependencies } from '~/worldkit/combat/combatant';
import { initializeCombatantAttributes } from '~/worldkit/combat/combatant';
import { createTestActor } from '~/testing/world-testing';
import { Actor, Stat } from '~/types/entity/actor';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { CombatFacing, Team } from '~/types/combat';
import { SessionStatus, SessionStrategy } from '~/types/session';
import { EntityType } from '~/types/entity/entity';
import { CombatTurnDidEnd, CombatTurnDidStart, EventType } from '~/types/event';
import { type RollResultWithoutModifiers } from '~/types/dice';
import { createTransformerContext } from '~/worldkit/context';
import { calculateStatBonus, getStatValue } from '~/worldkit/entity/actor/stats';
import { extractFirstEventOfType } from '~/testing/event';
import { WellKnownActor } from '~/types/actor';

const TEST_PLACE_ID: PlaceURN = 'flux:place:test-place';
const TEST_SESSION_ID: SessionURN = 'flux:session:combat:test-session';
const TEST_ACTOR_ID: ActorURN = 'flux:actor:test-actor';
const TEST_ACTOR_2_ID: ActorURN = 'flux:actor:test-actor-2';
const TEST_TEAM: Team = Team.BRAVO;
const TEST_TEAM_2: Team = Team.ALPHA;
const DEFAULT_TIMESTAMP = 123456789000;

const identity = <T>(input: T): T => input;

describe('session', () => {
  describe('createCombatant', () => {
    it('should create combatant with initialized attributes', () => {
      const actor = createTestActor({
        id: TEST_ACTOR_ID,
        location: TEST_PLACE_ID,
        stats: {
          [Stat.POW]: { nat: 15, eff: 15, mods: {} },
          [Stat.FIN]: { nat: 12, eff: 12, mods: {} },
          [Stat.RES]: { nat: 10, eff: 10, mods: {} },
          [Stat.INT]: { nat: 10, eff: 10, mods: {} },
          [Stat.PER]: { nat: 14, eff: 14, mods: {} },
          [Stat.MEM]: { nat: 10, eff: 10, mods: {} },
        },
      });
      const team = TEST_TEAM;

      const combatant = createCombatant(actor, team);

      expect(combatant.actorId).toBe(actor.id);
      expect(combatant.team).toBe(team);
      expect(combatant.mass).toBe(0);
      expect(combatant.target).toBeNull();
      expect(combatant.position.coordinate).toBe(0);
      expect(combatant.position.facing).toBe(CombatFacing.RIGHT);
      expect(combatant.position.speed).toBe(0);
      expect(combatant.ap.nat.cur).toBeGreaterThan(0);
      expect(combatant.energy.nat.cur).toBeGreaterThan(0);
      expect(combatant.balance.nat.cur).toBe(1.0);
      expect(combatant.initiative).toBeDefined();
    });

    it('should use perception modifier for initiative', () => {
      const highPerceptionActor = createTestActor({
        stats: {
          [Stat.PER]: { nat: 20, eff: 20, mods: {} },
          [Stat.POW]: { nat: 10, eff: 10, mods: {} },
          [Stat.FIN]: { nat: 10, eff: 10, mods: {} },
          [Stat.RES]: { nat: 10, eff: 10, mods: {} },
          [Stat.INT]: { nat: 10, eff: 10, mods: {} },
          [Stat.MEM]: { nat: 10, eff: 10, mods: {} },
        },
      });
      const lowPerceptionActor = createTestActor({
        stats: {
          [Stat.PER]: { nat: 5, eff: 5, mods: {} },
          [Stat.POW]: { nat: 10, eff: 10, mods: {} },
          [Stat.FIN]: { nat: 10, eff: 10, mods: {} },
          [Stat.RES]: { nat: 10, eff: 10, mods: {} },
          [Stat.INT]: { nat: 10, eff: 10, mods: {} },
          [Stat.MEM]: { nat: 10, eff: 10, mods: {} },
        },
      });

      // Create controlled RNG mock that applies modifiers properly
      const mockExecuteRoll = vi.fn().mockImplementation((spec, mods) => {
        const baseRoll = 10; // Same base roll for both
        const perceptionMod = mods.perception?.value || 0;
        return {
          dice: spec,
          values: [baseRoll],
          mods,
          natural: baseRoll,
          result: baseRoll + perceptionMod, // Apply perception modifier
        };
      });

      // Create dependencies with controlled RNG
      const testDeps: CreateCombatantDependencies = {
        timestamp: () => DEFAULT_TIMESTAMP,
        computeInitiative: (actor: Actor) => {
          // Use the mock roll result but add perception bonus
          const mockResult = mockExecuteRoll('1d20', []);
          const perceptionValue = getStatValue(actor, Stat.PER);
          const bonus = calculateStatBonus(perceptionValue);
          return {
            ...mockResult,
            result: mockResult.natural + bonus,
          };
        },
        initializeCombatantAttributes: initializeCombatantAttributes,
      };

      const highPerceptionCombatant = createCombatant(highPerceptionActor, Team.BRAVO, identity, testDeps);
      const lowPerceptionCombatant = createCombatant(lowPerceptionActor, Team.ALPHA, identity, testDeps);

      // With same base roll, higher perception should result in higher initiative
      expect(highPerceptionCombatant.initiative?.result).toBeGreaterThan(
        lowPerceptionCombatant.initiative?.result || 0
      );

      // Verify the mock was called for both combatants
      expect(mockExecuteRoll).toHaveBeenCalledTimes(2);
    });

    it('should use default dependencies when none provided', () => {
      const actor = createTestActor({ id: TEST_ACTOR_ID });
      const team = TEST_TEAM;

      const combatant = createCombatant(actor, team);

      expect(combatant.actorId).toBe(actor.id);
      expect(combatant.team).toBe(team);
      expect(combatant.initiative).toBeDefined();
    });
  });

  describe('createCombatSession', () => {
    it('should create session with provided combatants', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const actor1 = createTestActor({ id: TEST_ACTOR_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID });
      const combatant1 = createCombatant(actor1, TEST_TEAM);
      const combatant2 = createCombatant(actor2, TEST_TEAM_2);

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const input: CombatSessionInput = {
        location,
        combatants: [combatant1, combatant2],
      };

      const session = createCombatSession(context, input);

      expect(session.type).toBe(EntityType.SESSION);
      expect(session.strategy).toBe(SessionStrategy.COMBAT);
      expect(session.status).toBe(SessionStatus.PENDING);
      expect(session.data.location).toBe(location);
      expect(session.data.combatants.size).toBe(2);
      expect(session.data.combatants.has(TEST_ACTOR_ID)).toBe(true);
      expect(session.data.combatants.has(TEST_ACTOR_2_ID)).toBe(true);
      expect(session.data.initiative.size).toBe(2);
      expect(session.data.battlefield).toBeDefined();
      expect(session.data.currentTurn.round).toBe(1);
      expect(session.data.currentTurn.number).toBe(1);
    });

    it('should use provided session ID', () => {
      const context = createTransformerContext();
      const sessionId = 'custom-session-id' as SessionURN;
      const input: CombatSessionInput = {
        id: sessionId,
        location: TEST_PLACE_ID,
        combatants: [],
      };

      const session = createCombatSession(context, input);

      expect(session.id).toBe(sessionId);
    });

    it('should generate session ID when not provided', () => {
      const context = createTransformerContext();
      const input: CombatSessionInput = {
        location: 'test-location' as PlaceURN,
        combatants: [],
      };

      const session = createCombatSession(context, input);

      expect(session.id).toBeDefined();
      expect(session.id).toContain('flux:session:combat:');
    });

    it('should throw error when actor not found', () => {
      const context = createTransformerContext();
      const combatant = createCombatant(createTestActor({ id: 'flux:actor:missing-actor' }), TEST_TEAM);
      const input: CombatSessionInput = {
        location: TEST_PLACE_ID,
        combatants: [combatant],
      };

      expect(() => {
        createCombatSession(context, input);
      }).toThrow('Actor flux:actor:missing-actor not found');
    });

    it('should set first actor based on initiative order', () => {
      const context = createTransformerContext();
      const actor1 = createTestActor({ id: TEST_ACTOR_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID });
      const combatant1 = createCombatant(actor1, TEST_TEAM);
      const combatant2 = createCombatant(actor2, TEST_TEAM_2);

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const input: CombatSessionInput = {
        location: TEST_PLACE_ID,
        combatants: [combatant1, combatant2],
      };

      const session = createCombatSession(context, input);

      expect(session.data.currentTurn.actor).toBeDefined();
      expect([TEST_ACTOR_ID, TEST_ACTOR_2_ID]).toContain(session.data.currentTurn.actor);
    });

    it('should use provided initiative when specified', () => {
      const context = createTransformerContext();
      const actor1 = createTestActor({ id: TEST_ACTOR_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID });
      const combatant1 = createCombatant(actor1, TEST_TEAM);
      const combatant2 = createCombatant(actor2, TEST_TEAM_2);

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      // Create deterministic initiative with actor2 going first
      const deterministicInitiative = new Map<ActorURN, RollResultWithoutModifiers>([
        [TEST_ACTOR_2_ID, {
          dice: '1d20' as const,
          values: [20],
          bonus: 0,
          natural: 20,
          result: 20
        }],
        [TEST_ACTOR_ID, {
          dice: '1d20' as const,
          values: [1],
          bonus: 0,
          natural: 1,
          result: 1
        }]
      ]);

      const input: CombatSessionInput = {
        location: TEST_PLACE_ID,
        combatants: [combatant1, combatant2],
        initiative: deterministicInitiative,
      };

      const session = createCombatSession(context, input);

      // Should use provided initiative instead of computing new rolls
      expect(session.data.initiative).toBe(deterministicInitiative);
      expect(session.data.initiative.get(TEST_ACTOR_ID)?.result).toBe(1);
      expect(session.data.initiative.get(TEST_ACTOR_2_ID)?.result).toBe(20);

      // First actor should be the one with highest initiative (actor2)
      expect(session.data.currentTurn.actor).toBe(TEST_ACTOR_2_ID);
    });
  });

  describe('createCombatSessionId', () => {
    it('should create session ID with combat strategy', () => {
      const sessionId = createCombatSessionId();

      expect(sessionId).toContain('flux:session:combat:');
    });

    it('should use provided key', () => {
      const key = 'custom-key';
      const sessionId = createCombatSessionId(key);

      expect(sessionId).toContain(key);
    });
  });

  describe('getCombatSession', () => {
    it('should return session when it exists', () => {
      const context = createTransformerContext();
      const sessionId = TEST_SESSION_ID;
      const session = createCombatSession(context, {
        id: sessionId,
        location: TEST_PLACE_ID,
        combatants: [],
      });

      context.world.sessions[sessionId] = session;

      const result = getCombatSession(context.world, sessionId);

      expect(result).toBe(session);
    });

    it('should return undefined when session does not exist', () => {
      const context = createTransformerContext();
      const sessionId = TEST_SESSION_ID;
      const result = getCombatSession(context.world, sessionId);

      expect(result).toBeUndefined();
    });
  });

  describe('useCombatSession', () => {
    it('should create new session when no sessionId provided', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const hook = createCombatSessionApi(context, location);

      expect(hook.isNew).toBe(true);
      expect(hook.session).toBeDefined();
      expect(hook.session.data.location).toBe(location);
      expect(hook.session.data.combatants.size).toBe(0);
    });

    it('should retrieve existing session when sessionId provided', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const sessionId = TEST_SESSION_ID;
      const existingSession = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [],
      });

      context.world.sessions[sessionId] = existingSession;

      const hook = createCombatSessionApi(context, location, sessionId);

      expect(hook.isNew).toBe(false);
      expect(hook.session).toBe(existingSession);
    });

    it('should throw error when adding duplicate combatant', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const actor = createTestActor({ id: TEST_ACTOR_ID });

      context.world.actors[TEST_ACTOR_ID] = actor;

      const hook = createCombatSessionApi(context, location);
      hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);

      expect(() => {
        hook.addCombatant(TEST_ACTOR_ID, Team.ALPHA);
              }).toThrow('Combatant flux:actor:test-actor already exists');
    });

    it('should throw error when adding combatant for missing actor', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;

      const hook = createCombatSessionApi(context, location);

      expect(() => {
        hook.addCombatant('missing-actor' as ActorURN, Team.BRAVO);
      }).toThrow('Actor missing-actor not found');
    });

    it('should provide working removeCombatant method', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const actor = createTestActor({ id: TEST_ACTOR_ID });

      context.world.actors[TEST_ACTOR_ID] = actor;

      const hook = createCombatSessionApi(context, location);
      hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
      expect(hook.session.data.combatants.has(TEST_ACTOR_ID)).toBe(true);

      hook.removeCombatant(TEST_ACTOR_ID);
      expect(hook.session.data.combatants.has(TEST_ACTOR_ID)).toBe(false);
    });

    it('should provide working useCombatant method', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const actor = createTestActor({ id: TEST_ACTOR_ID });

      context.world.actors[TEST_ACTOR_ID] = actor;

      const hook = createCombatSessionApi(context, location);
      hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);

      const combatantHook = hook.getCombatantApi(TEST_ACTOR_ID);

      expect(combatantHook).toHaveProperty('target');
      expect(combatantHook).toHaveProperty('advance');
      expect(combatantHook).toHaveProperty('retreat');
      expect(combatantHook).toHaveProperty('attack');
      expect(combatantHook).toHaveProperty('defend');
      expect(combatantHook).toHaveProperty('done');
      expect(typeof combatantHook.target).toBe('function');
      expect(typeof combatantHook.advance).toBe('function');
      expect(typeof combatantHook.retreat).toBe('function');
      expect(typeof combatantHook.attack).toBe('function');
      expect(typeof combatantHook.defend).toBe('function');
      expect(typeof combatantHook.done).toBe('function');
    });

    it('should provide combatant hook with working turn advancement via done method', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const actor1 = createTestActor({ id: TEST_ACTOR_ID, location });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location });

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const hook = createCombatSessionApi(context, location);
      hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
      hook.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);
      hook.startCombat();

      // Get initial turn state
      const initialTurn = hook.session.data.currentTurn;
      const initialActor = initialTurn.actor;
      const initialTurnNumber = initialTurn.number;
      const initialRoundNumber = hook.session.data.currentTurn.round;

      // Clear any events from combat start
      context.getDeclaredEvents();

      // Get the combatant hook for the current actor and call done
      const combatantHook = hook.getCombatantApi(initialActor);
      const events = combatantHook.done('test-done-trace');

      // Verify turn advanced
      const newTurn = hook.session.data.currentTurn;
      expect(newTurn.actor).not.toBe(initialActor); // Should be different actor
      expect(newTurn.number).toBe(initialTurnNumber + 1); // Turn number incremented
      expect(hook.session.data.currentTurn.round).toBe(initialRoundNumber); // Same round

      // Verify that events were generated (at least one)
      expect(events.length).toBeGreaterThanOrEqual(1);

      // First event should be turn end
      const turnEndEvent = extractFirstEventOfType<CombatTurnDidEnd>(events, EventType.COMBAT_TURN_DID_END)!;
      expect(turnEndEvent.type).toBe(EventType.COMBAT_TURN_DID_END);
      expect(turnEndEvent.actor).toBe(WellKnownActor.SYSTEM);
      expect(turnEndEvent.payload.turnActor).toBe(initialActor);

      // Last event should be turn start (if multiple events)
      if (events.length > 1) {
        const lastEvent = events[events.length - 1] as CombatTurnDidStart;
        expect(lastEvent.type).toBe(EventType.COMBAT_TURN_DID_START);
        expect(lastEvent.actor).toBe(WellKnownActor.SYSTEM);
      }

      // Combat should continue since both teams have viable combatants at the correct location
      expect(hook.session.status).toBe(SessionStatus.RUNNING);

      // Verify the new actor is the other combatant
      const expectedNextActor = initialActor === TEST_ACTOR_ID ? TEST_ACTOR_2_ID : TEST_ACTOR_ID;
      expect(newTurn.actor).toBe(expectedNextActor);
    });

    it('should use provided dependencies', () => {
      const context = createTransformerContext((c) => ({
        ...c,
        timestamp: vi.fn(() => 9999999999),
      }));

      const location = TEST_PLACE_ID;
      const hook = createCombatSessionApi(context, location);

      expect(hook.session).toBeDefined();
      // Dependencies are used internally during combatant creation
    });

    describe('startCombat', () => {
      it('should start combat and declare events', () => {
        const context = createTransformerContext();
        const location = TEST_PLACE_ID;
        const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
        const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

        context.world.actors[TEST_ACTOR_ID] = actor1;
        context.world.actors[TEST_ACTOR_2_ID] = actor2;

        const hook = createCombatSessionApi(context, location);

        // Initially no events should be declared
        expect(context.getDeclaredEvents()).toHaveLength(0);
        expect(hook.session.status).toBe(SessionStatus.PENDING);

        hook.addCombatant(TEST_ACTOR_ID, TEST_TEAM);
        hook.addCombatant(TEST_ACTOR_2_ID, TEST_TEAM_2);

        // Still no events until startCombat is called
        expect(context.getDeclaredEvents()).toHaveLength(0);

        hook.startCombat();

        // Now events should be declared
        const events = context.getDeclaredEvents();
        expect(events).toHaveLength(3);
        expect(events[0].type).toBe(EventType.COMBAT_SESSION_DID_START);
        expect(events[1].type).toBe(EventType.COMBAT_SESSION_STATUS_DID_CHANGE);
        expect(events[2].type).toBe(EventType.COMBAT_TURN_DID_START);
        expect(hook.session.status).toBe(SessionStatus.RUNNING);
      });

      it('should throw error when starting combat with no combatants', () => {
        const context = createTransformerContext();
        const location = TEST_PLACE_ID;

        const hook = createCombatSessionApi(context, location);

        expect(() => {
          hook.startCombat();
        }).toThrow('Combat cannot start without at least two combatants; received none');
      });

      it('should throw error when starting combat twice', () => {
        const context = createTransformerContext();
        const location = TEST_PLACE_ID;
        const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
        const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

        context.world.actors[TEST_ACTOR_ID] = actor1;
        context.world.actors[TEST_ACTOR_2_ID] = actor2;

        const hook = createCombatSessionApi(context, location);
        hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
        hook.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);
        hook.startCombat();

        expect(() => {
          hook.startCombat();
        }).toThrow('Combat has already started');
      });

      it('should prevent removing combatants after combat starts', () => {
        const context = createTransformerContext();
        const location = TEST_PLACE_ID;
        const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
        const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

        context.world.actors[TEST_ACTOR_ID] = actor1;
        context.world.actors[TEST_ACTOR_2_ID] = actor2;

        const hook = createCombatSessionApi(context, location);
        hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
        hook.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);
        hook.startCombat();

        expect(() => {
          hook.removeCombatant(TEST_ACTOR_ID);
        }).toThrow('Cannot remove combatants after combat has started');
      });

      it('should recalculate initiative when starting combat', () => {
        const context = createTransformerContext();
        const location = TEST_PLACE_ID;
        const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
        const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

        context.world.actors[TEST_ACTOR_ID] = actor1;
        context.world.actors[TEST_ACTOR_2_ID] = actor2;

        const hook = createCombatSessionApi(context, location);
        hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
        hook.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

        // Initiative should be empty before starting
        expect(hook.session.data.initiative.size).toBe(0);

        hook.startCombat();

        // Initiative should be calculated for all combatants
        expect(hook.session.data.initiative.size).toBe(2);
        expect(hook.session.data.initiative.has(TEST_ACTOR_ID)).toBe(true);
        expect(hook.session.data.initiative.has(TEST_ACTOR_2_ID)).toBe(true);
      });

      it('should throw error when starting combat without opposing teams', () => {
        const context = createTransformerContext();
        const location = TEST_PLACE_ID;
        const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
        const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

        context.world.actors[TEST_ACTOR_ID] = actor1;
        context.world.actors[TEST_ACTOR_2_ID] = actor2;

        const hook = createCombatSessionApi(context, location);

        // Add both combatants to the same team
        hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
        hook.addCombatant(TEST_ACTOR_2_ID, Team.BRAVO);

        expect(() => {
          hook.startCombat();
        }).toThrow();
      });
    });

    it('should preserve status of existing sessions', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const sessionId = TEST_SESSION_ID;
      const existingSession = createCombatSession(context, {
        id: sessionId,
        location,
        combatants: [],
      });

      // Simulate a session that was already started
      existingSession.status = SessionStatus.RUNNING;
      context.world.sessions[sessionId] = existingSession;

      const hook = createCombatSessionApi(context, location, sessionId);

      expect(hook.isNew).toBe(false);
      expect(hook.session.status).toBe(SessionStatus.RUNNING);
    });

    it('should create session with deterministic initiative when provided', () => {
      const context = createTransformerContext();
      const location = TEST_PLACE_ID;
      const actor1 = createTestActor({ id: TEST_ACTOR_ID, location });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location });

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      // Create deterministic initiative with actor2 going first
      const deterministicInitiative = new Map<ActorURN, RollResultWithoutModifiers>([
        [TEST_ACTOR_2_ID, {
          dice: '1d20' as const,
          values: [20],
          bonus: 0,
          natural: 20,
          result: 20
        }],
        [TEST_ACTOR_ID, {
          dice: '1d20' as const,
          values: [1],
          bonus: 0,
          natural: 1,
          result: 1
        }]
      ]);

      const hook = createCombatSessionApi(context, location, undefined, undefined, deterministicInitiative);

      // Session should be created with the provided initiative
      expect(hook.isNew).toBe(true);
      expect(hook.session.data.initiative).toBe(deterministicInitiative);
      expect(hook.session.data.initiative.get(TEST_ACTOR_ID)?.result).toBe(1);
      expect(hook.session.data.initiative.get(TEST_ACTOR_2_ID)?.result).toBe(20);

      // Add combatants and start combat
      hook.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
      hook.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);
      hook.startCombat();

      // Initiative should be preserved after starting combat
      expect(hook.session.data.initiative.get(TEST_ACTOR_ID)?.result).toBe(1);
      expect(hook.session.data.initiative.get(TEST_ACTOR_2_ID)?.result).toBe(20);

      // First actor should be the one with highest initiative (actor2)
      expect(hook.session.data.currentTurn.actor).toBe(TEST_ACTOR_2_ID);
    });

  });

  describe('edge cases', () => {
    it('should handle empty combatants list', () => {
      const context = createTransformerContext();
      const input: CombatSessionInput = {
        location: TEST_PLACE_ID,
        combatants: [],
      };

      const session = createCombatSession(context, input);

      expect(session.data.combatants.size).toBe(0);
      expect(session.data.initiative.size).toBe(0);
    });

    it('should handle single combatant', () => {
      const context = createTransformerContext();
      const actor = createTestActor({ id: TEST_ACTOR_ID });
      const combatant = createCombatant(actor, Team.ALPHA);

      context.world.actors[TEST_ACTOR_ID] = actor;

      const input: CombatSessionInput = {
        location: TEST_PLACE_ID,
        combatants: [combatant],
      };

      const session = createCombatSession(context, input);

      expect(session.data.combatants.size).toBe(1);
      expect(session.data.initiative.size).toBe(1);
      expect(session.data.currentTurn.actor).toBe(TEST_ACTOR_ID);
    });

    it('should handle multiple combatants with same team', () => {
      const context = createTransformerContext();
      const actor1 = createTestActor({ id: TEST_ACTOR_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID });
      const combatant1 = createCombatant(actor1, Team.ALPHA);
      const combatant2 = createCombatant(actor2, Team.ALPHA);

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const input: CombatSessionInput = {
        location: TEST_PLACE_ID,
        combatants: [combatant1, combatant2],
      };

      const session = createCombatSession(context, input);

      expect(session.data.combatants.size).toBe(2);
      expect(session.data.combatants.get(TEST_ACTOR_ID)?.team).toBe(Team.ALPHA);
      expect(session.data.combatants.get(TEST_ACTOR_2_ID)?.team).toBe(Team.ALPHA);
    });
  });
});
