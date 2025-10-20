import { describe, it, expect } from 'vitest';
import { sortInitiativeOrder } from './initiative';
import { createCombatant } from '~/worldkit/combat/combatant';
import { createTestActor } from '~/testing/world-testing';
import { Actor, ActorURN, RollResult } from '~/types';
import { Combatant, Team } from '~/types/combat';
import { ATTACK_ROLL_SPECIFICATION } from './dice';

describe('sortInitiativeOrder', () => {
  it('should sort by initiative with cascading tie-breaking (roll > finesse > combat initiator)', () => {
    // Create test actors with different finesse stats
    const alice: Actor = createTestActor({
      id: 'flux:actor:alice' as ActorURN,
      stats: { fin: { eff: 15 } } // High finesse
    });
    const bob: Actor = createTestActor({
      id: 'flux:actor:bob' as ActorURN,
      stats: { fin: { eff: 12 } } // Medium finesse
    });
    const charlie: Actor = createTestActor({
      id: 'flux:actor:charlie' as ActorURN,
      stats: { fin: { eff: 10 } } // Low finesse
    });
    const diana: Actor = createTestActor({
      id: 'flux:actor:diana' as ActorURN,
      stats: { fin: { eff: 10 } } // Same finesse as Charlie
    });

    // Create combatants - Diana initiated combat
    const aliceCombatant: Combatant = createCombatant(alice, Team.ALPHA);
    const bobCombatant: Combatant = createCombatant(bob, Team.BRAVO);
    const charlieCombatant: Combatant = createCombatant(charlie, Team.CHARLIE);
    const dianaCombatant: Combatant = createCombatant(diana, Team.ALPHA, (c: Combatant) => ({ ...c, didInitiateCombat: true }));

    // Create initiative rolls with strategic ties
    const initiativeRolls = new Map<ActorURN, RollResult>([
      [alice.id, {
        dice: ATTACK_ROLL_SPECIFICATION,
        natural: 18,
        result: 18,
        values: [18],
        bonus: 0,
      }], // Highest roll
      [bob.id, {
        dice: ATTACK_ROLL_SPECIFICATION,
        natural: 15,
        result: 15,
        values: [15],
        bonus: 0,
      }],   // Medium roll
      [charlie.id, {
        dice: ATTACK_ROLL_SPECIFICATION,
        natural: 12,
        result: 12,
        values: [12],
        bonus: 0,
      }], // Tied with Diana
      [diana.id, {
        dice: ATTACK_ROLL_SPECIFICATION,
        natural: 12,
        result: 12,
        values: [12],
        bonus: 0,
      }],   // Tied with Charlie
    ]);

    const actors = new Map([
      [alice.id, alice],
      [bob.id, bob],
      [charlie.id, charlie],
      [diana.id, diana],
    ]);

    const combatants = new Map([
      [alice.id, aliceCombatant],
      [bob.id, bobCombatant],
      [charlie.id, charlieCombatant],
      [diana.id, dianaCombatant],
    ]);

    const getActorOrFail = (actorId: ActorURN) => {
      const actor = actors.get(actorId);
      if (!actor) throw new Error(`Actor ${actorId} not found`);
      return actor;
    };

    // Sort the initiative order
    const sortedOrder = sortInitiativeOrder(initiativeRolls, combatants, getActorOrFail);
    const sortedActorIds = Array.from(sortedOrder.keys());

    // Expected order:
    // 1. Alice (roll: 18) - highest roll wins
    // 2. Bob (roll: 15) - second highest roll
    // 3. Diana (roll: 12, fin: 10, initiated combat) - tied roll, same finesse as Charlie, but initiated combat
    // 4. Charlie (roll: 12, fin: 10, did not initiate) - tied roll, same finesse as Diana, but didn't initiate

    expect(sortedActorIds).toEqual([
      alice.id,   // Highest roll (18)
      bob.id,     // Second highest roll (15)
      diana.id,   // Tied roll (12), same finesse (10), but initiated combat
      charlie.id, // Tied roll (12), same finesse (10), but didn't initiate combat
    ]);

    // Verify the rolls are preserved correctly
    expect(sortedOrder.get(alice.id)?.result).toBe(18);
    expect(sortedOrder.get(bob.id)?.result).toBe(15);
    expect(sortedOrder.get(charlie.id)?.result).toBe(12);
    expect(sortedOrder.get(diana.id)?.result).toBe(12);
  });

  it('should break ties by finesse when rolls are equal', () => {
    // Create actors with different finesse but same roll
    const highFin: Actor = createTestActor({
      id: 'flux:actor:high-fin' as ActorURN,
      stats: { fin: { eff: 18 } }
    });
    const lowFin: Actor = createTestActor({
      id: 'flux:actor:low-fin' as ActorURN,
      stats: { fin: { eff: 8 } }
    });

    const combatants = new Map([
      [highFin.id, createCombatant(highFin, Team.ALPHA)],
      [lowFin.id, createCombatant(lowFin, Team.BRAVO)],
    ]);

    // Same initiative roll
    const initiativeRolls = new Map<ActorURN, RollResult>([
      [highFin.id, {
        dice: ATTACK_ROLL_SPECIFICATION,
        natural: 15,
        result: 15,
        values: [15],
        bonus: 0,
      }],
      [lowFin.id, { dice: ATTACK_ROLL_SPECIFICATION, natural: 15, result: 15, values: [15], bonus: 0 }],
    ]);

    const actors = new Map([
      [highFin.id, highFin],
      [lowFin.id, lowFin],
    ]);

    const getActorOrFail = (actorId: ActorURN) => {
      const actor = actors.get(actorId);
      if (!actor) throw new Error(`Actor ${actorId} not found`);
      return actor;
    };

    const sortedOrder = sortInitiativeOrder(initiativeRolls, combatants, getActorOrFail);
    const sortedActorIds = Array.from(sortedOrder.keys());

    // Higher finesse should go first
    expect(sortedActorIds).toEqual([highFin.id, lowFin.id]);
  });

  it('should break complete ties using lexicographic actor ID sorting', () => {
    // Create two actors with identical stats and rolls
    // Use IDs that will sort predictably: 'bravo' comes before 'zulu' alphabetically
    const bravoActor: Actor = createTestActor({
      id: 'flux:actor:bravo' as ActorURN,
      stats: { fin: { eff: 12 } }
    });
    const zuluActor: Actor = createTestActor({
      id: 'flux:actor:zulu' as ActorURN,
      stats: { fin: { eff: 12 } } // Same finesse
    });

    // NEITHER actor initiated combat
    const combatants = new Map([
      [bravoActor.id, createCombatant(bravoActor, Team.ALPHA)],
      [zuluActor.id, createCombatant(zuluActor, Team.BRAVO)],
    ]);

    // Identical initiative rolls
    const initiativeRolls = new Map<ActorURN, RollResult>([
      [bravoActor.id, {
        dice: ATTACK_ROLL_SPECIFICATION,
        natural: 15,
        result: 15,
        values: [15],
        bonus: 0,
      }],
      [zuluActor.id, {
        dice: ATTACK_ROLL_SPECIFICATION,
        natural: 15,
        result: 15,
        values: [15],
        bonus: 0,
      }], // Same roll
    ]);

    const actors = new Map([
      [bravoActor.id, bravoActor],
      [zuluActor.id, zuluActor],
    ]);

    const getActorOrFail = (actorId: ActorURN) => {
      const actor = actors.get(actorId);
      if (!actor) throw new Error(`Actor ${actorId} not found`);
      return actor;
    };

    const sortedOrder = sortInitiativeOrder(initiativeRolls, combatants, getActorOrFail);
    const sortedActorIds = Array.from(sortedOrder.keys());

    // With lexicographic tie-breaking, 'bravo' should come before 'zulu'
    expect(sortedActorIds).toEqual([bravoActor.id, zuluActor.id]);

    // Verify the order is deterministic by running it multiple times
    for (let i = 0; i < 5; i++) {
      const repeatOrder = sortInitiativeOrder(initiativeRolls, combatants, getActorOrFail);
      const repeatActorIds = Array.from(repeatOrder.keys());
      expect(repeatActorIds).toEqual([bravoActor.id, zuluActor.id]);
    }
  });
});
