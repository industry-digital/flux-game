/**
 * CLEAVE Action
 *
 * Multi-target sweeping attack that hits all enemies at optimal weapon range.
 * Requires a two-handed weapon and costs significantly more AP than individual strikes.
 */

import { Actor, Stat } from '~/types/entity/actor';
import { ATTACK_ROLL_SPECIFICATION, CombatSession, computeDistanceBetweenCombatants } from '~/worldkit/combat';
import { ActionCost, AttackOutcome, AttackType, Combatant } from '~/types/combat';
import { CombatantDidAttack, CombatantWasAttacked, EventType, WorldEvent } from '~/types/event';
import { RollResult } from '~/types/dice';
import { calculateActorEvasionRating, resolveHitAttempt } from '~/worldkit/combat/evasion';
import { calculateWeaponDamage } from '~/worldkit/combat/damage';
import { createWorldEvent } from '~/worldkit/event';
import { ActorURN } from '~/types/taxonomy';
import { deductAp } from '~/worldkit/combat/combatant';
import { TransformerContext } from '~/types/handler';
import { calculateAttackRating } from '~/worldkit/combat/attack';
import { decrementHp } from '~/worldkit/entity/actor/health';
import { getStatValue } from '~/worldkit/entity/actor/stats';
import { isTwoHandedWeapon } from '~/worldkit/schema/weapon/util';
import { isActorAlive } from '~/worldkit/entity/actor';
import { canWeaponHitFromDistance } from '~/worldkit/combat/weapon';
import { createCleaveCost } from '~/worldkit/combat/tactical-cost';
import { canAfford, consumeEnergy } from '~/worldkit/entity/actor/capacitor';

export type CleaveDependencies = {
  createWorldEvent?: typeof createWorldEvent;
  resolveHitAttempt?: typeof resolveHitAttempt;
  calculateActorEvasionRating?: typeof calculateActorEvasionRating;
  calculateWeaponDamage?: typeof calculateWeaponDamage;
  computeDistanceBetweenCombatants?: typeof computeDistanceBetweenCombatants;
  calculateAttackRating?: typeof calculateAttackRating;
  isActorAlive?: typeof isActorAlive;
  isTwoHandedWeapon?: typeof isTwoHandedWeapon;
};

export const DEFAULT_CLEAVE_DEPS: Readonly<CleaveDependencies> = {
  createWorldEvent,
  resolveHitAttempt,
  calculateActorEvasionRating,
  calculateWeaponDamage,
  computeDistanceBetweenCombatants,
  calculateAttackRating,
  isActorAlive,
  isTwoHandedWeapon,
};

export type CleaveMethod = (trace?: string) => WorldEvent[];

/**
 * Find all enemies at optimal weapon range for cleave attack
 */
function findCleaveTargets(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  weapon: any,
  deps: CleaveDependencies
): ActorURN[] {
  const {
    computeDistanceBetweenCombatants: computeDistanceBetweenCombatantsImpl = computeDistanceBetweenCombatants,
    isActorAlive: isActorAliveImpl = isActorAlive,
  } = deps;

  const targets: ActorURN[] = [];

  for (const [actorId, targetCombatant] of session.data.combatants) {
    // Skip self
    if (actorId === combatant.actorId) continue;

    const targetActor = context.world.actors[actorId];
    if (!targetActor || !isActorAliveImpl(targetActor)) continue;

    // Skip allies - only target enemies
    if (combatant.team === targetCombatant.team) continue;

    // Check if target is at weapon's effective range
    const distance = computeDistanceBetweenCombatantsImpl(combatant, targetCombatant);
    const canHit = canWeaponHitFromDistance(weapon, distance);

    if (canHit) {
      targets.push(actorId);
    }
  }

  return targets;
}

/**
 * Create CLEAVE method - multi-target sweeping attack
 */
export function createCleaveMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  {
    createWorldEvent: createWorldEventImpl = createWorldEvent,
    resolveHitAttempt: resolveHitAttemptImpl = resolveHitAttempt,
    calculateActorEvasionRating: calculateActorEvasionRatingImpl = calculateActorEvasionRating,
    calculateWeaponDamage: calculateWeaponDamageImpl = calculateWeaponDamage,
    computeDistanceBetweenCombatants: computeDistanceBetweenCombatantsImpl = computeDistanceBetweenCombatants,
    calculateAttackRating: calculateAttackRatingImpl = calculateAttackRating,
    isActorAlive: isActorAliveImpl = isActorAlive,
    isTwoHandedWeapon: isTwoHandedWeaponImpl = isTwoHandedWeapon,
  }: CleaveDependencies = DEFAULT_CLEAVE_DEPS
): CleaveMethod {
  const { declareError } = context;
  const { computeCombatMass } = context.mass;

  return (trace: string = context.uniqid()): WorldEvent[] => {
    const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);

    // Check if weapon is two-handed (actors always have a weapon, even if it's bare hands)
    if (!isTwoHandedWeaponImpl(weapon)) {
      declareError('CLEAVE requires a two-handed weapon.', trace);
      return [];
    }

    // Find all targets at optimal range
    const targets = findCleaveTargets(context, session, actor, combatant, weapon, {
      computeDistanceBetweenCombatants: computeDistanceBetweenCombatantsImpl,
      isActorAlive: isActorAliveImpl,
    });

    if (targets.length === 0) {
      declareError('No enemies at optimal weapon range for CLEAVE.', trace);
      return [];
    }

    const weaponMassKg = weapon.baseMass / 1000;
    const finesse = getStatValue(actor, Stat.FIN);
    const cost: ActionCost = createCleaveCost(weaponMassKg, finesse, targets.length);

    // Check AP affordability
    if (cost.ap! > combatant.ap.eff.cur) {
      declareError(`CLEAVE would cost ${cost.ap} AP (you have ${combatant.ap.eff.cur} AP).`, trace);
      return [];
    }

    // Check energy affordability
    if (cost.energy! > 0 && !canAfford(actor, cost.energy!)) {
      declareError(`CLEAVE would cost ${cost.energy} energy (you don't have enough stamina).`, trace);
      return [];
    }

    // Deduct costs upfront
    deductAp(combatant, cost.ap!);
    if (cost.energy! > 0) {
      consumeEnergy(actor, cost.energy!);
    }

    const allEvents: WorldEvent[] = [];
    const power = getStatValue(actor, Stat.POW);

    // Create single COMBATANT_DID_ATTACK event for the cleave action
    const cleaveAttackEvent: CombatantDidAttack = createWorldEventImpl({
      type: EventType.COMBATANT_DID_ATTACK,
      location: actor.location,
      trace: trace,
      actor: actor.id,
      payload: {
        target: targets[0], // Primary target (could be omitted for area attacks)
        attackType: AttackType.CLEAVE,
        cost,
        roll: { dice: ATTACK_ROLL_SPECIFICATION, values: [], mods: {}, natural: 0, result: 0 }, // Will be updated with first roll
        attackRating: 0, // Will be updated with first attack rating
      },
    });

    let isFirstTarget = true;

    // Execute attack against each target
    for (const targetId of targets) {
      const targetCombatant = session.data.combatants.get(targetId);
      if (!targetCombatant) continue;

      const targetActor = context.world.actors[targetId];
      if (!targetActor || !isActorAliveImpl(targetActor)) continue;

      // Roll attack for this target
      const { values, sum: natural } = context.rollDice(ATTACK_ROLL_SPECIFICATION, context.random);
      const roll: RollResult = {
        dice: ATTACK_ROLL_SPECIFICATION,
        values,
        natural,
        result: natural,
      };

      const defenderEvasionRating = calculateActorEvasionRatingImpl(
        targetActor,
        computeCombatMass,
      );

      const attackRating = calculateAttackRatingImpl(actor, weapon, roll.result);
      const hitResolution = resolveHitAttemptImpl(
        defenderEvasionRating,
        attackRating,
        targetCombatant.energy.position,
        context,
      );

      let damage = 0;
      let outcome: AttackOutcome = AttackOutcome.MISS;

      if (!hitResolution.evaded) {
        outcome = AttackOutcome.HIT;
        damage = calculateWeaponDamageImpl(weaponMassKg, power);
        decrementHp(targetActor, damage);
      }

      // Update the cleave attack event with the first target's roll and attack rating
      if (isFirstTarget) {
        cleaveAttackEvent.payload.roll = roll;
        cleaveAttackEvent.payload.attackRating = attackRating;
        isFirstTarget = false;
      }

      // Generate COMBATANT_WAS_ATTACKED event for this target
      const wasAttackedEvent: CombatantWasAttacked = createWorldEventImpl({
        type: EventType.COMBATANT_WAS_ATTACKED,
        location: targetActor.location,
        trace: trace,
        actor: targetId,
        payload: {
          source: actor.id,
          type: AttackType.CLEAVE,
          outcome,
          attackRating,
          evasionRating: defenderEvasionRating,
          damage,
        },
      });

      context.declareEvent(wasAttackedEvent);
      allEvents.push(wasAttackedEvent);

      // Generate death event if target died
      if (damage > 0 && targetActor.hp.eff.cur <= 0) {
        const deathEvent = createWorldEventImpl({
          type: EventType.COMBATANT_DID_DIE,
          location: actor.location,
          actor: targetId,
          trace: trace,
          payload: {
            killer: actor.id,
          },
        });

        context.declareEvent(deathEvent);
        allEvents.push(deathEvent);
      }
    }

    // Declare and add the cleave attack event
    context.declareEvent(cleaveAttackEvent);
    allEvents.unshift(cleaveAttackEvent); // Add at beginning so it comes before target events

    return allEvents;
  };
}
