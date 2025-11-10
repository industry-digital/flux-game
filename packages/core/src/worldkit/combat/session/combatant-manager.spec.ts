import { describe, it, expect, vi } from 'vitest';
import { createCombatantManager } from './combatant-manager';
import { createTransformerContext } from '~/worldkit/context';
import { createTestActor } from '~/testing/world-testing';
import { createCombatSession } from './session';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { Team, CombatFacing } from '~/types/combat';
import { SessionStatus } from '~/types/entity/session';
import { EventType } from '~/types/event';

const TEST_PLACE_ID: PlaceURN = 'flux:place:test-place';
const TEST_ACTOR_ID: ActorURN = 'flux:actor:test-actor';
const TEST_ACTOR_2_ID: ActorURN = 'flux:actor:test-actor-2';

describe('createCombatantManager', () => {
  it('should add combatant with automatic positioning', () => {
    const context = createTransformerContext((c) => ({
      ...c,
      getDeclaredEvents: vi.fn((pattern?: RegExp | EventType) => []),
    }));
    const actor = createTestActor({ id: TEST_ACTOR_ID });

    context.world.actors[TEST_ACTOR_ID] = actor;

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const manager = createCombatantManager(context, session);
    manager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);

    expect(session.data.combatants.has(TEST_ACTOR_ID)).toBe(true);
    const combatant = session.data.combatants.get(TEST_ACTOR_ID);
    expect(combatant?.actorId).toBe(TEST_ACTOR_ID);
    expect(combatant?.team).toBe(Team.BRAVO);
    expect(combatant?.position.coordinate).toBe(200); // Team BRAVO at 2/3 * 300 = 200
    expect(combatant?.position.facing).toBe(CombatFacing.LEFT);
  });

  it('should position second team on opposite side', () => {
    const context = createTransformerContext();
    const actor1 = createTestActor({ id: TEST_ACTOR_ID });
    const actor2 = createTestActor({ id: TEST_ACTOR_2_ID });

    context.world.actors[TEST_ACTOR_ID] = actor1;
    context.world.actors[TEST_ACTOR_2_ID] = actor2;

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const manager = createCombatantManager(context, session);
    manager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    manager.addCombatant(TEST_ACTOR_2_ID, Team.ALPHA);

    const combatant1 = session.data.combatants.get(TEST_ACTOR_ID);
    const combatant2 = session.data.combatants.get(TEST_ACTOR_2_ID);

    expect(combatant1?.position.coordinate).toBe(200); // Team BRAVO: 2/3 * 300 = 200
    expect(combatant1?.position.facing).toBe(CombatFacing.LEFT);

    expect(combatant2?.position.coordinate).toBe(100); // Team ALPHA: 1/3 * 300 = 100
    expect(combatant2?.position.facing).toBe(CombatFacing.RIGHT);
  });

  it('should allow position override', () => {
    const context = createTransformerContext();
    const actor = createTestActor({ id: TEST_ACTOR_ID });

    context.world.actors[TEST_ACTOR_ID] = actor;

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const customPosition = {
      coordinate: 150,
      facing: CombatFacing.LEFT,
      speed: 5,
    };

    const manager = createCombatantManager(context, session);
    manager.addCombatant(TEST_ACTOR_ID, Team.BRAVO, customPosition);

    const combatant = session.data.combatants.get(TEST_ACTOR_ID);
    expect(combatant?.position).toEqual(customPosition);
  });

  it('should throw error when adding duplicate combatant', () => {
    const context = createTransformerContext();
    const actor = createTestActor({ id: TEST_ACTOR_ID });

    context.world.actors[TEST_ACTOR_ID] = actor;

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const manager = createCombatantManager(context, session);
    manager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);

    expect(() => {
      manager.addCombatant(TEST_ACTOR_ID, Team.ALPHA);
    }).toThrow('Combatant flux:actor:test-actor already exists');
  });

  it('should throw error when adding combatant for missing actor', () => {
    const context = createTransformerContext();

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const manager = createCombatantManager(context, session);

    expect(() => {
      manager.addCombatant('missing-actor' as ActorURN, Team.BRAVO);
    }).toThrow('Actor missing-actor not found');
  });

  it('should throw error when adding combatant after combat starts', () => {
    const context = createTransformerContext();
    const actor = createTestActor({ id: TEST_ACTOR_ID });

    context.world.actors[TEST_ACTOR_ID] = actor;

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    session.status = SessionStatus.RUNNING;

    const manager = createCombatantManager(context, session);

    expect(() => {
      manager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    }).toThrow('Cannot add combatants after combat has started');
  });

  it('should remove combatant successfully', () => {
    const context = createTransformerContext();
    const actor = createTestActor({ id: TEST_ACTOR_ID });

    context.world.actors[TEST_ACTOR_ID] = actor;

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const manager = createCombatantManager(context, session);
    manager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);
    expect(session.data.combatants.has(TEST_ACTOR_ID)).toBe(true);

    manager.removeCombatant(TEST_ACTOR_ID);
    expect(session.data.combatants.has(TEST_ACTOR_ID)).toBe(false);
  });

  it('should throw error when removing combatant after combat starts', () => {
    const context = createTransformerContext();
    const actor = createTestActor({ id: TEST_ACTOR_ID });

    context.world.actors[TEST_ACTOR_ID] = actor;

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const manager = createCombatantManager(context, session);
    manager.addCombatant(TEST_ACTOR_ID, Team.BRAVO);

    session.status = SessionStatus.RUNNING;

    expect(() => {
      manager.removeCombatant(TEST_ACTOR_ID);
    }).toThrow('Cannot remove combatants after combat has started');
  });

  it('should reproduce positioning bug: multiple BRAVO team members get wrong positions', () => {
    const context = createTransformerContext();
    const alice = createTestActor({ id: 'flux:actor:alice' as ActorURN });
    const dave = createTestActor({ id: 'flux:actor:dave' as ActorURN });
    const franz = createTestActor({ id: 'flux:actor:franz' as ActorURN });

    context.world.actors['flux:actor:alice'] = alice;
    context.world.actors['flux:actor:dave'] = dave;
    context.world.actors['flux:actor:franz'] = franz;

    const session = createCombatSession(context, {
      location: TEST_PLACE_ID,
      combatants: [],
    });

    const manager = createCombatantManager(context, session);

    // Add Alice (Team ALPHA) first
    manager.addCombatant('flux:actor:alice' as ActorURN, Team.ALPHA);

    // Add Dave (Team BRAVO) second
    manager.addCombatant('flux:actor:dave' as ActorURN, Team.BRAVO);

    // Add Franz (Team BRAVO) third - this should reproduce the bug
    manager.addCombatant('flux:actor:franz' as ActorURN, Team.BRAVO);

    const aliceCombatant = session.data.combatants.get('flux:actor:alice' as ActorURN);
    const daveCombatant = session.data.combatants.get('flux:actor:dave' as ActorURN);
    const franzCombatant = session.data.combatants.get('flux:actor:franz' as ActorURN);

    console.log('Alice position:', aliceCombatant?.position.coordinate);
    console.log('Dave position:', daveCombatant?.position.coordinate);
    console.log('Franz position:', franzCombatant?.position.coordinate);

    // Expected behavior: Alice at 100, Dave and Franz both at 200
    expect(aliceCombatant?.position.coordinate).toBe(100); // Team ALPHA at 1/3 * 300 = 100
    expect(daveCombatant?.position.coordinate).toBe(200);  // Team BRAVO at 2/3 * 300 = 200

    // BUG: Franz gets positioned at 100 (same as Alice) instead of 200 (same as Dave)
    // This test will fail, demonstrating the bug
    expect(franzCombatant?.position.coordinate).toBe(200); // Should be 200, but will be 100 due to bug
  });
});
