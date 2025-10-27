import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTurnManager } from './turn-manager';
import { createTransformerContext } from '~/worldkit/context';
import { createTestActor } from '~/testing/world-testing';
import { createCombatSession } from './session';
import { createCombatantManager } from './combatant-manager';
import { createCombatLifecycle } from './combat-lifecycle';
import { createCombatGameStateApi } from './game-state';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { Team } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { EventType, WorldEvent } from '~/types/event';
import { RollResult } from '~/types/dice';
import { WellKnownActor } from '~/types/actor';

const TEST_PLACE_ID: PlaceURN = 'flux:place:test-place';
const TEST_SESSION_ID: SessionURN = 'flux:session:combat:test-session';
const TEST_ACTOR_ID: ActorURN = 'flux:actor:test-actor';
const TEST_ACTOR_2_ID: ActorURN = 'flux:actor:test-actor-2';

describe('Turn Manager', () => {
  let context: TransformerContext;
  let declaredEvents!: WorldEvent[];

  beforeEach(() => {
    declaredEvents = [];
    context = createTransformerContext((c) => ({
      ...c,
      getDeclaredEvents: vi.fn((pattern?: RegExp | EventType) => declaredEvents),
    }));
  });

describe('createTurnManager', () => {
  it('should advance turn to next actor in same round', () => {
    const actor1 = createTestActor({ id: TEST_ACTOR_ID, location: TEST_PLACE_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID, location: TEST_PLACE_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    // Set up combat with two actors
    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    combatantManager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);
    lifecycle.startCombat('test-trace');

    const turnManager = createTurnManager(context, session);

    const currentActor = session.data.currentTurn.actor;
    const currentRound = session.data.currentTurn.round;
    const completedTurnsCount = session.data.completedTurns.length;

    const events = turnManager.advanceTurn('test-trace-2');

    // Should advance to next actor in same round
    expect(session.data.currentTurn.round).toBe(currentRound);
    expect(session.data.completedTurns.length).toBe(completedTurnsCount + 1);
    expect(session.data.currentTurn.actor).not.toBe(currentActor);

    // Should emit turn start event
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('combat:turn:started');
  });

  it('should advance to next round when last actor in round', () => {
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

    const turnManager = createTurnManager(context, session);

    // Advance through all actors in the round
    const initiativeOrder = Array.from(session.data.initiative.keys());
    const currentRound = session.data.currentTurn.round;

    // Advance to the last actor
    for (let i = 0; i < initiativeOrder.length - 1; i++) {
      turnManager.advanceTurn();
    }

    // Now advance from the last actor - should start new round
    const events = turnManager.advanceTurn();

    expect(session.data.currentTurn.round).toBe(currentRound + 1);
    expect(session.data.currentTurn.number).toBe(1);
    expect(session.data.currentTurn.actor).toBe(initiativeOrder[0]);
    expect(session.data.completedTurns.length).toBe(initiativeOrder.length);

    // Should emit round end, round start, and turn start events
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('combat:turn:started');
  });

  it('should properly track completed turns', () => {
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

    const turnManager = createTurnManager(context, session);

    const initialCompletedTurns = session.data.completedTurns.length;
    const currentTurn = session.data.currentTurn;

    turnManager.advanceTurn();

    // Previous turn should be in completed list
    expect(session.data.completedTurns.length).toBe(initialCompletedTurns + 1);
    expect(session.data.completedTurns).toContainEqual(currentTurn);
  });

  it('should emit events with correct payload data', () => {
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

    const turnManager = createTurnManager(context, session);

    const events = turnManager.advanceTurn('test-trace');
    const turnEvent = events[0];

    expect(turnEvent.actor).toBe(WellKnownActor.SYSTEM);
    expect(turnEvent.payload).toHaveProperty('round');
    expect(turnEvent.payload).toHaveProperty('turn');
    expect(turnEvent.payload).toHaveProperty('turnActor');
    expect(turnEvent.location).toBe(TEST_PLACE_ID);
    expect(turnEvent.trace).toBe('test-trace');
  });

  it('should skip dead combatants when advancing turns', () => {
    const ALICE_ID: ActorURN = 'flux:actor:alice' as ActorURN;
    const BOB_ID: ActorURN = 'flux:actor:bob' as ActorURN;
    const CHARLIE_ID: ActorURN = 'flux:actor:charlie' as ActorURN;

    // Create three actors: Alice (Team A), Bob and Charlie (Team B)
    const alice = createTestActor({ id: ALICE_ID, location: TEST_PLACE_ID });
    const bob = createTestActor({ id: BOB_ID, location: TEST_PLACE_ID });
    const charlie = createTestActor({ id: CHARLIE_ID, location: TEST_PLACE_ID });

    context.world.actors[ALICE_ID] = alice;
    context.world.actors[BOB_ID] = bob;
    context.world.actors[CHARLIE_ID] = charlie;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(ALICE_ID, Team.ALPHA);
    combatantManager.addCombatant(BOB_ID, Team.BRAVO);
    combatantManager.addCombatant(CHARLIE_ID, Team.BRAVO);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

    // Set up initiative order: Alice, Bob, Charlie
    const initiativeRolls: Map<ActorURN, RollResult> = new Map([
      [ALICE_ID, { dice: '1d20', values: [20], result: 20, natural: 20, mods: {}, bonus: 0 }],
      [BOB_ID, { dice: '1d20', values: [19], result: 19, natural: 19, mods: {}, bonus: 0 }],
      [CHARLIE_ID, { dice: '1d20', values: [18], result: 18, natural: 18, mods: {}, bonus: 0 }]
    ]);

    lifecycle.startCombat('test-trace', { initiativeRolls });

    // Verify initial state: Alice's turn
    expect(session.data.currentTurn.actor).toBe(ALICE_ID);

    // Kill Bob during Alice's turn (simulate Alice killing Bob)
    context.world.actors[BOB_ID].hp.eff.cur = 0;

    const turnManager = createTurnManager(context, session);

    // Advance turn - this should skip Bob and go to Charlie
    const events = turnManager.advanceTurn('test-trace');

    // EXPECTED BEHAVIOR: Should skip Bob (who is dead) and go to Charlie
    // This test will fail until we implement the fix
    expect(session.data.currentTurn.actor).toBe(CHARLIE_ID);
  });

  it('should advance to next round when all remaining combatants in current round are dead', () => {
    const ALICE_ID: ActorURN = 'flux:actor:alice' as ActorURN;
    const BOB_ID: ActorURN = 'flux:actor:bob' as ActorURN;
    const CHARLIE_ID: ActorURN = 'flux:actor:charlie' as ActorURN;

    // Create three actors: Alice (Team A), Bob and Charlie (Team B)
    const alice = createTestActor({ id: ALICE_ID, location: TEST_PLACE_ID });
    const bob = createTestActor({ id: BOB_ID, location: TEST_PLACE_ID });
    const charlie = createTestActor({ id: CHARLIE_ID, location: TEST_PLACE_ID });

    context.world.actors[ALICE_ID] = alice;
    context.world.actors[BOB_ID] = bob;
    context.world.actors[CHARLIE_ID] = charlie;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(ALICE_ID, Team.ALPHA);
    combatantManager.addCombatant(BOB_ID, Team.BRAVO);
    combatantManager.addCombatant(CHARLIE_ID, Team.BRAVO);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

    // Set up initiative order: Alice, Bob, Charlie
    const initiativeRolls: Map<ActorURN, RollResult> = new Map([
      [ALICE_ID, { dice: '1d20', values: [20], result: 20, natural: 20, mods: {}, bonus: 0 }],
      [BOB_ID, { dice: '1d20', values: [19], result: 19, natural: 19, mods: {}, bonus: 0 }],
      [CHARLIE_ID, { dice: '1d20', values: [18], result: 18, natural: 18, mods: {}, bonus: 0 }]
    ]);

    lifecycle.startCombat('test-trace', { initiativeRolls });

    // Verify initial state: Alice's turn, Round 1
    expect(session.data.currentTurn.actor).toBe(ALICE_ID);
    expect(session.data.currentTurn.round).toBe(1);

    // Kill both Bob and Charlie during Alice's turn
    context.world.actors[BOB_ID].hp.eff.cur = 0;
    context.world.actors[CHARLIE_ID].hp.eff.cur = 0;

    const turnManager = createTurnManager(context, session);

    // Advance turn - since Bob and Charlie are dead, should advance to Round 2 with Alice
    const events = turnManager.advanceTurn('test-trace');

    // Should advance to Round 2 and give Alice the first turn again
    expect(session.data.currentTurn.round).toBe(2);
    expect(session.data.currentTurn.actor).toBe(ALICE_ID);
    expect(session.data.currentTurn.number).toBe(1);
  });

  it('should handle complex death scenario - 1v3 combat with deaths mid-combat', () => {
    const ALICE_ID: ActorURN = 'flux:actor:alice' as ActorURN;
    const BOB_ID: ActorURN = 'flux:actor:bob' as ActorURN;
    const DAVE_ID: ActorURN = 'flux:actor:dave' as ActorURN;
    const FRANZ_ID: ActorURN = 'flux:actor:franz' as ActorURN;

    // Create four actors: Alice (Team A) vs Bob, Dave, Franz (Team B)
    const alice = createTestActor({ id: ALICE_ID, location: TEST_PLACE_ID });
    const bob = createTestActor({ id: BOB_ID, location: TEST_PLACE_ID });
    const dave = createTestActor({ id: DAVE_ID, location: TEST_PLACE_ID });
    const franz = createTestActor({ id: FRANZ_ID, location: TEST_PLACE_ID });

    context.world.actors[ALICE_ID] = alice;
    context.world.actors[BOB_ID] = bob;
    context.world.actors[DAVE_ID] = dave;
    context.world.actors[FRANZ_ID] = franz;

    const session = createCombatSession(context, {
      id: TEST_SESSION_ID,
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const combatantManager = createCombatantManager(context, session);
    combatantManager.addCombatant(ALICE_ID, Team.ALPHA);
    combatantManager.addCombatant(BOB_ID, Team.BRAVO);
    combatantManager.addCombatant(DAVE_ID, Team.BRAVO);
    combatantManager.addCombatant(FRANZ_ID, Team.BRAVO);

    const gameState = createCombatGameStateApi(context, session, TEST_PLACE_ID);
    const lifecycle = createCombatLifecycle(context, session, TEST_SESSION_ID, TEST_PLACE_ID, gameState);

    // Set up initiative order: Dave, Franz, Alice, Bob
    const initiativeRolls: Map<ActorURN, RollResult> = new Map([
      [DAVE_ID, { dice: '1d20', values: [20], result: 20, natural: 20, mods: {}, bonus: 0 }],
      [FRANZ_ID, { dice: '1d20', values: [19], result: 19, natural: 19, mods: {}, bonus: 0 }],
      [ALICE_ID, { dice: '1d20', values: [18], result: 18, natural: 18, mods: {}, bonus: 0 }],
      [BOB_ID, { dice: '1d20', values: [17], result: 17, natural: 17, mods: {}, bonus: 0 }]
    ]);

    lifecycle.startCombat('test-trace', { initiativeRolls });

    // Verify initial state: Dave's turn
    expect(session.data.currentTurn.actor).toBe(DAVE_ID);

    const turnManager = createTurnManager(context, session);

    // Scenario: Dave -> Franz -> Alice (kills Franz) -> Bob (should be skipped if dead)

    // 1. Dave's turn completes
    let events = turnManager.advanceTurn('dave-turn');
    expect(session.data.currentTurn.actor).toBe(FRANZ_ID);

    // 2. Franz's turn completes
    events = turnManager.advanceTurn('franz-turn');
    expect(session.data.currentTurn.actor).toBe(ALICE_ID);

    // 3. During Alice's turn, Franz dies (simulate Alice killing Franz)
    context.world.actors[FRANZ_ID].hp.eff.cur = 0;

    // 4. Alice's turn completes
    events = turnManager.advanceTurn('alice-turn');
    expect(session.data.currentTurn.actor).toBe(BOB_ID);

    // 5. Now Bob dies (simulate death from damage over time or other effect)
    context.world.actors[BOB_ID].hp.eff.cur = 0;

    // 6. Bob's turn should be skipped, advance to next round with Dave
    events = turnManager.advanceTurn('bob-turn-skip');

    // Should skip Bob and advance to Round 2 with Dave (first alive actor)
    expect(session.data.currentTurn.round).toBe(2);
    expect(session.data.currentTurn.actor).toBe(DAVE_ID);
    expect(session.data.currentTurn.number).toBe(1);

    // 7. Now Dave dies too (simulate Alice killing Dave in previous round)
    context.world.actors[DAVE_ID].hp.eff.cur = 0;

    // 8. Dave's turn should be skipped, only Alice remains
    events = turnManager.advanceTurn('dave-turn-skip');

    // Should skip Dave and give turn to Alice (only alive combatant)
    expect(session.data.currentTurn.actor).toBe(ALICE_ID);
  });
});
});
