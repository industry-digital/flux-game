import { describe, it, expect, vi } from 'vitest';
import { createCombatLifecycle } from './combat-lifecycle';
import { createCombatGameStateApi } from './game-state';
import { createTransformerContext } from '~/worldkit/context';
import { createTestActor } from '~/testing/world-testing';
import { createCombatSession } from './session';
import { createCombatantManager } from './combatant-manager';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { Team } from '~/types/combat';
import { SessionStatus } from '~/types/session';
import { RollResult } from '~/types/dice';
import { EventType } from '~/types/event';

const TEST_PLACE_ID: PlaceURN = 'flux:place:test-place';
const TEST_SESSION_ID: SessionURN = 'flux:session:combat:test-session';
const TEST_ACTOR_ID: ActorURN = 'flux:actor:test-actor';
const TEST_ACTOR_2_ID: ActorURN = 'flux:actor:test-actor-2';

describe('createCombatLifecycle', () => {
  it('should have properly initialized test context', () => {
    const context = createTransformerContext((c) => ({
      ...c,
      getDeclaredEvents: vi.fn((pattern?: RegExp | EventType) => []),
    }));

    // Verify all required combat infrastructure is present
    expect(context.rollDice).toBeDefined();
    expect(typeof context.rollDice).toBe('function');
    expect(context.searchCache).toBeDefined();
    expect(context.distanceCache).toBeDefined();
    expect(context.targetCache).toBeDefined();
    expect(context.weaponCache).toBeDefined();
  });

  it('should start combat and declare events', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    // Add combatants using the combatant manager
    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    // Initially no events should be declared
    expect(context.getDeclaredEvents()).toHaveLength(0);
    expect(session.status).toBe(SessionStatus.PENDING);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);
    const startEvents = lifecycle.startCombat();

    // Events should be returned and declared
    expect(startEvents).toHaveLength(4);
    expect(startEvents[0].type).toBe(EventType.COMBAT_SESSION_DID_START);
    expect(startEvents[1].type).toBe(EventType.COMBAT_SESSION_STATUS_DID_CHANGE);
    expect(startEvents[2].type).toBe(EventType.COMBAT_ROUND_DID_START);
    expect(startEvents[3].type).toBe(EventType.COMBAT_TURN_DID_START);

    // Events should also be declared to context
    const contextEvents = context.getDeclaredEvents();
    expect(contextEvents).toHaveLength(4);
    expect(session.status).toBe(SessionStatus.RUNNING);
  });

  it('should throw error when starting combat with no combatants', () => {
    const context = createTransformerContext();
    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

    expect(() => {
      lifecycle.startCombat();
    }).toThrow('Combat cannot start without at least two combatants; received none');
  });

  it('should throw error when starting combat twice', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);
    lifecycle.startCombat();

    expect(() => {
      lifecycle.startCombat();
    }).toThrow('Combat has already started');
  });

  it('should recalculate initiative when starting combat', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    // Initiative should be empty before starting
    expect(session.data.initiative.size).toBe(0);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);
    lifecycle.startCombat();

    // Initiative should be calculated for all combatants
    expect(session.data.initiative.size).toBe(2);
    expect(session.data.initiative.has(TEST_ACTOR_ID)).toBe(true);
    expect(session.data.initiative.has(TEST_ACTOR_2_ID)).toBe(true);
  });

  it('should throw error when starting combat without opposing teams', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const combatantManager = createCombatantManager(context, session);
    // Add both combatants to the same team
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.BRAVO);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

    expect(() => {
      lifecycle.startCombat();
    }).toThrow('Cannot start combat without opposing teams. All 2 combatants are on team(s): bravo. Combat requires at least 2 different teams.');
  });

  it('should set first actor based on initiative', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);
    lifecycle.startCombat();

    expect(session.data.rounds.current.turns.current.actor).toBeDefined();
    expect([TEST_ACTOR_ID, TEST_ACTOR_2_ID]).toContain(session.data.rounds.current.turns.current.actor);
  });

  it('should preserve existing initiative when starting combat', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    // Create deterministic initiative with actor2 going first
    const deterministicInitiative = new Map<ActorURN, RollResult>([
      [TEST_ACTOR_2_ID, {
        dice: '1d20' as const,
        values: [20],
        mods: {},
        natural: 20,
        result: 20
      }],
      [TEST_ACTOR_ID, {
        dice: '1d20' as const,
        values: [1],
        mods: {},
        natural: 1,
        result: 1
      }]
    ]);

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
      initiative: deterministicInitiative,
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    // Verify initiative is set before starting combat
    expect(session.data.initiative.size).toBe(2);
    expect(session.data.initiative.get(TEST_ACTOR_ID)?.result).toBe(1);
    expect(session.data.initiative.get(TEST_ACTOR_2_ID)?.result).toBe(20);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);
    lifecycle.startCombat();

    // Initiative should be preserved (not recalculated)
    expect(session.data.initiative.size).toBe(2);
    expect(session.data.initiative.get(TEST_ACTOR_ID)?.result).toBe(1);
    expect(session.data.initiative.get(TEST_ACTOR_2_ID)?.result).toBe(20);

    // First actor should be the one with highest initiative (actor2)
    expect(session.data.rounds.current.turns.current.actor).toBe(TEST_ACTOR_2_ID);
  });

  it('should use initiative rolls from options when provided', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    // Create deterministic initiative with actor1 going first (via options)
    const optionsInitiative = new Map<ActorURN, RollResult>([
      [TEST_ACTOR_ID, {
        dice: '1d20' as const,
        values: [20],
        mods: {},
        natural: 20,
        result: 20
      }],
      [TEST_ACTOR_2_ID, {
        dice: '1d20' as const,
        values: [5],
        mods: {},
        natural: 5,
        result: 5
      }]
    ]);

    // Initiative should be empty before starting
    expect(session.data.initiative.size).toBe(0);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

    // Start combat with options-provided initiative
    lifecycle.startCombat(undefined, { initiativeRolls: optionsInitiative });

    // Initiative should be set from options
    expect(session.data.initiative.size).toBe(2);
    expect(session.data.initiative.get(TEST_ACTOR_ID)?.result).toBe(20);
    expect(session.data.initiative.get(TEST_ACTOR_2_ID)?.result).toBe(5);

    // First actor should be the one with highest initiative from options (actor1)
    expect(session.data.rounds.current.turns.current.actor).toBe(TEST_ACTOR_ID);
  });

  it('should override existing initiative when options are provided', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    // Create session with existing initiative (actor2 first)
    const existingInitiative = new Map<ActorURN, RollResult>([
      [TEST_ACTOR_2_ID, {
        dice: '1d20' as const,
        values: [18],
        mods: {},
        natural: 18,
        result: 18
      }],
      [TEST_ACTOR_ID, {
        dice: '1d20' as const,
        values: [3],
        mods: {},
        natural: 3,
        result: 3
      }]
    ]);

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
      initiative: existingInitiative,
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    // Create new initiative via options (actor1 first)
    const optionsInitiative = new Map<ActorURN, RollResult>([
      [TEST_ACTOR_ID, {
        dice: '1d20' as const,
        values: [19],
        mods: {},
        natural: 19,
        result: 19
      }],
      [TEST_ACTOR_2_ID, {
        dice: '1d20' as const,
        values: [2],
        mods: {},
        natural: 2,
        result: 2
      }]
    ]);

    // Verify existing initiative before starting
    expect(session.data.initiative.size).toBe(2);
    expect(session.data.initiative.get(TEST_ACTOR_2_ID)?.result).toBe(18);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

    // Start combat with options that should override existing initiative
    lifecycle.startCombat(undefined, { initiativeRolls: optionsInitiative });

    // Initiative should be overridden by options
    expect(session.data.initiative.size).toBe(2);
    expect(session.data.initiative.get(TEST_ACTOR_ID)?.result).toBe(19);
    expect(session.data.initiative.get(TEST_ACTOR_2_ID)?.result).toBe(2);

    // First actor should be from options initiative (actor1)
    expect(session.data.rounds.current.turns.current.actor).toBe(TEST_ACTOR_ID);
  });

  describe('pauseCombat and resumeCombat', () => {
    it('should pause running combat and emit status change event', () => {
      const context = createTransformerContext();
      const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const session = createCombatSession(context, {
        id: TEST_SESSION_ID,
        location: TEST_PLACE_ID,
        combatants: [],
      });

      const combatantManager = createCombatantManager(context, session);
      combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
      combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

      const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
      const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

      // Start combat first
      lifecycle.startCombat();
      expect(session.status).toBe(SessionStatus.RUNNING);

      // Clear events from combat start
      const eventsBeforePause = context.getDeclaredEvents().length;

      // Pause combat
      const pauseEvents = lifecycle.pauseCombat();

      expect(session.status).toBe(SessionStatus.PAUSED);
      expect(pauseEvents).toHaveLength(1);
      expect(pauseEvents[0].type).toBe(EventType.COMBAT_SESSION_STATUS_DID_CHANGE);
      expect((pauseEvents[0].payload as any).previousStatus).toBe(SessionStatus.RUNNING);
      expect((pauseEvents[0].payload as any).currentStatus).toBe(SessionStatus.PAUSED);

      // Verify event was declared to context
      const allEvents = context.getDeclaredEvents();
      expect(allEvents).toHaveLength(eventsBeforePause + 1);
      expect(allEvents[allEvents.length - 1].type).toBe('combat:session:status:changed');
    });

    it('should resume paused combat and emit status change event', () => {
      const context = createTransformerContext();
      const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const session = createCombatSession(context, {
        id: TEST_SESSION_ID,
        location: TEST_PLACE_ID,
        combatants: [],
      });

      const combatantManager = createCombatantManager(context, session);
      combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
      combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

      const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
      const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

      // Start and pause combat first
      lifecycle.startCombat();
      lifecycle.pauseCombat();
      expect(session.status).toBe(SessionStatus.PAUSED);

      // Clear events from previous actions
      const eventsBeforeResume = context.getDeclaredEvents().length;

      // Resume combat
      const resumeEvents = lifecycle.resumeCombat();

      expect(session.status).toBe(SessionStatus.RUNNING);
      expect(resumeEvents).toHaveLength(1);
      expect(resumeEvents[0].type).toBe('combat:session:status:changed');
      expect((resumeEvents[0].payload as any).previousStatus).toBe(SessionStatus.PAUSED);
      expect((resumeEvents[0].payload as any).currentStatus).toBe(SessionStatus.RUNNING);

      // Verify event was declared to context
      const allEvents = context.getDeclaredEvents();
      expect(allEvents).toHaveLength(eventsBeforeResume + 1);
      expect(allEvents[allEvents.length - 1].type).toBe('combat:session:status:changed');
    });

    it('should throw error when pausing combat that is not running', () => {
      const context = createTransformerContext();
      const session = createCombatSession(context, {
        id: TEST_SESSION_ID,
        location: TEST_PLACE_ID,
        combatants: [],
      });

      const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
      const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

      // Try to pause combat that hasn't started
      expect(() => {
        lifecycle.pauseCombat();
      }).toThrow('Cannot pause combat that is not running');

      expect(session.status).toBe(SessionStatus.PENDING);
    });

    it('should throw error when resuming combat that is not paused', () => {
      const context = createTransformerContext();
      const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const session = createCombatSession(context, {
        id: TEST_SESSION_ID,
        location: TEST_PLACE_ID,
        combatants: [],
      });

      const combatantManager = createCombatantManager(context, session);
      combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
      combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

      const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
      const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

      // Start combat (but don't pause)
      lifecycle.startCombat();
      expect(session.status).toBe(SessionStatus.RUNNING);

      // Try to resume combat that isn't paused
      expect(() => {
        lifecycle.resumeCombat();
      }).toThrow('Cannot resume combat that is not paused');

      expect(session.status).toBe(SessionStatus.RUNNING);
    });

    it('should throw error when pausing already paused combat', () => {
      const context = createTransformerContext();
      const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const session = createCombatSession(context, {
        id: TEST_SESSION_ID,
        location: TEST_PLACE_ID,
        combatants: [],
      });

      const combatantManager = createCombatantManager(context, session);
      combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
      combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

      const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
      const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

      // Start and pause combat
      lifecycle.startCombat();
      lifecycle.pauseCombat();
      expect(session.status).toBe(SessionStatus.PAUSED);

      // Try to pause already paused combat
      expect(() => {
        lifecycle.pauseCombat();
      }).toThrow('Cannot pause combat that is not running');

      expect(session.status).toBe(SessionStatus.PAUSED);
    });

    it('should allow multiple pause/resume cycles', () => {
      const context = createTransformerContext();
      const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
      const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

      context.world.actors[TEST_ACTOR_ID] = actor1;
      context.world.actors[TEST_ACTOR_2_ID] = actor2;

      const session = createCombatSession(context, {
        id: TEST_SESSION_ID,
        location: TEST_PLACE_ID,
        combatants: [],
      });

      const combatantManager = createCombatantManager(context, session);
      combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
      combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

      const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
      const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

      // Start combat
      lifecycle.startCombat();
      expect(session.status).toBe(SessionStatus.RUNNING);

      // First pause/resume cycle
      lifecycle.pauseCombat();
      expect(session.status).toBe(SessionStatus.PAUSED);
      lifecycle.resumeCombat();
      expect(session.status).toBe(SessionStatus.RUNNING);

      // Second pause/resume cycle
      lifecycle.pauseCombat();
      expect(session.status).toBe(SessionStatus.PAUSED);
      lifecycle.resumeCombat();
      expect(session.status).toBe(SessionStatus.RUNNING);

      // Verify we can still end combat normally
      lifecycle.endCombat();
      expect(session.status).toBe(SessionStatus.TERMINATED);
    });
  });
});
