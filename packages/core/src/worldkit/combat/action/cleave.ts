/**
 * CLEAVE Action
 *
 * Multi-target sweeping attack that hits all enemies at optimal weapon range.
 * Requires a two-handed weapon and costs significantly more AP than individual strikes.
 */

import { Actor, Stat } from '~/types/entity/actor';
import { ATTACK_ROLL_SPECIFICATION, CombatSession, computeDistanceBetweenCombatants } from '~/worldkit/combat';
import { ActionCost, Combatant } from '~/types/combat';
import { EventType, WorldEvent } from '~/types/event';
import { RollResult } from '~/types/dice';
import { calculateActorEvasionRating, resolveHitAttempt } from '~/worldkit/combat/evasion';
import { calculateWeaponDamage } from '~/worldkit/combat/damage';
import { createWorldEvent } from '~/worldkit/event';
import { ActorURN } from '~/types/taxonomy';
import { deductAp } from '~/worldkit/combat/combatant';
import { TransformerContext } from '~/types/handler';
import { createStrikeCost } from '~/worldkit/combat/tactical-cost';
import { calculateAttackRating } from '~/worldkit/combat/attack';
import { decrementHp } from '~/worldkit/entity/actor/health';
import { getEffectiveSkillRank } from '~/worldkit/entity/actor/skill';
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
  canWeaponHitFromDistance?: typeof canWeaponHitFromDistance;
  createStrikeCost?: typeof createStrikeCost;
  calculateAttackRating?: typeof calculateAttackRating;
  getEffectiveSkillRank?: typeof getEffectiveSkillRank;
  isActorAlive?: typeof isActorAlive;
  isTwoHandedWeapon?: typeof isTwoHandedWeapon;
};

export const DEFAULT_CLEAVE_DEPS: Readonly<CleaveDependencies> = {
  createWorldEvent,
  resolveHitAttempt,
  calculateActorEvasionRating,
  calculateWeaponDamage,
  computeDistanceBetweenCombatants,
  canWeaponHitFromDistance,
  createStrikeCost,
  calculateAttackRating,
  getEffectiveSkillRank,
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
    canWeaponHitFromDistance: canWeaponHitFromDistanceImpl = canWeaponHitFromDistance,
    createStrikeCost: createStrikeCostImpl = createStrikeCost,
    calculateAttackRating: calculateAttackRatingImpl = calculateAttackRating,
    getEffectiveSkillRank: getEffectiveSkillRankImpl = getEffectiveSkillRank,
    isActorAlive: isActorAliveImpl = isActorAlive,
    isTwoHandedWeapon: isTwoHandedWeaponImpl = isTwoHandedWeapon,
  }: CleaveDependencies = DEFAULT_CLEAVE_DEPS
): CleaveMethod {
  const { declareError } = context;
  const { computeCombatMass } = context.mass;

  return (trace: string = context.uniqid()): WorldEvent[] => {
    const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);
    if (!weapon) {
      declareError('You don\'t have a weapon equipped.', trace);
      return [];
    }

    // Check if weapon is two-handed
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
        mods: {},
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
      let outcome: 'hit' | 'miss' | 'hit:critical' | 'miss:critical' = 'miss';

      if (!hitResolution.evaded) {
        outcome = 'hit';
        damage = calculateWeaponDamageImpl(weaponMassKg, power);
        decrementHp(targetActor, damage);
      }

      // Generate individual attack event for each target (following STRIKE pattern)
      const attackEvent = createWorldEventImpl({
        type: EventType.COMBATANT_DID_ATTACK,
        location: actor.location,
        trace: trace,
        payload: {
          actor: actor.id,
          cost: targets.indexOf(targetId) === 0 ? cost : { ap: 0, energy: 0 }, // Show total cost on first attack only
          target: targetId,
          roll,
          damage,
          outcome,
          attackRating,
          evasionRating: defenderEvasionRating,
        },
      });

      context.declareEvent(attackEvent);
      allEvents.push(attackEvent);

      // Generate death event if target died
      if (damage > 0 && targetActor.hp.eff.cur <= 0) {
        const deathEvent = createWorldEventImpl({
          type: EventType.COMBATANT_DID_DIE,
          location: actor.location,
          trace: trace,
          payload: {
            actor: targetId,
          },
        });

        context.declareEvent(deathEvent);
        allEvents.push(deathEvent);
      }
    }

    return allEvents;
  };
}
