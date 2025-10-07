/**
 * Primitive Strike Action
 *
 * Direct weapon attack without AI planning - for expert manual control.
 * This is the "primitive" action that provides precise control over individual attacks.
 * Contains the core hit mechanics that AI-assisted attacks delegate to.
 */

import { Actor, Stat } from '~/types/entity/actor';
import { ATTACK_ROLL_SPECIFICATION, CombatSession, computeDistanceBetweenCombatants, canWeaponHitFromDistance } from '~/worldkit/combat';
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

export type StrikeDependencies = {
  createWorldEvent?: typeof createWorldEvent;
  resolveHitAttempt?: typeof resolveHitAttempt;
  calculateActorEvasionRating?: typeof calculateActorEvasionRating;
  calculateWeaponDamage?: typeof calculateWeaponDamage;
  computeDistanceBetweenCombatants?: typeof computeDistanceBetweenCombatants;
  canWeaponHitFromDistance?: typeof canWeaponHitFromDistance;
  createStrikeCost?: typeof createStrikeCost;
  calculateAttackRating?: typeof calculateAttackRating;
  getEffectiveSkillRank?: typeof getEffectiveSkillRank;
};

export const DEFAULT_STRIKE_DEPS: Readonly<StrikeDependencies> = {
  createWorldEvent,
  resolveHitAttempt,
  calculateActorEvasionRating,
  calculateWeaponDamage,
  computeDistanceBetweenCombatants,
  canWeaponHitFromDistance,
  createStrikeCost,
  calculateAttackRating,
  getEffectiveSkillRank,
};

export type StrikeMethod = (target?: ActorURN, trace?: string) => WorldEvent[];

/**
 * Create primitive strike method - direct weapon attack without AI assistance
 */
export function createStrikeMethod(
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
  }: StrikeDependencies = DEFAULT_STRIKE_DEPS
): StrikeMethod {
  const { declareError } = context;
  const { computeCombatMass } = context.mass;

  return (target?: ActorURN, trace: string = context.uniqid()): WorldEvent[] => {
    if (target) {
      combatant.target = target;
    }

    if (!combatant.target) {
      declareError(
        'No target selected. Use "target <name>" or "strike <name>" to select a target first.',
        trace
      );
      return [];
    }

    const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);
    if (!weapon) {
      declareError('You don\'t have a weapon equipped.', trace);
      return [];
    }

    const weaponMassKg = weapon.baseMass / 1000;

    const targetCombatant = session.data.combatants.get(combatant.target!);
    if (!targetCombatant) {
      declareError(`Strike target not found in combatants.`, trace);
      return [];
    }

    const distance = computeDistanceBetweenCombatantsImpl(combatant, targetCombatant);
    if (!canWeaponHitFromDistanceImpl(weapon, distance)) {
      declareError('You are too far away to strike that target.', trace);
      return [];
    }

      const finesse = getStatValue(actor, Stat.FIN);
    const cost: ActionCost = createStrikeCostImpl(weaponMassKg, finesse);
    if (cost.ap! > combatant.ap.eff.cur) {
      declareError(`You don't have enough AP to strike.`, trace);
      return [];
    }

    const { values, sum: natural } = context.rollDice(ATTACK_ROLL_SPECIFICATION, context.random);
    const roll: RollResult = {
      dice: ATTACK_ROLL_SPECIFICATION,
      values,
      mods: {},
      natural,
      result: natural, // TODO: compute result based on `mods` and `natural`.
    };

    const targetActor = context.world.actors[combatant.target!];
    const defenderEvasionRating = calculateActorEvasionRatingImpl(
      targetActor,
      computeCombatMass,
    );

    const attackRating = calculateAttackRatingImpl(actor, weapon, roll.result);
    const hitResolution = resolveHitAttemptImpl(
      defenderEvasionRating,
      attackRating,
      targetCombatant.energy.position,
      context, //--> ASSUMPTION: context contains necessary dependencies
    );

    let damage = 0;
    let outcome: 'hit' | 'miss' | 'hit:critical' | 'miss:critical' = 'miss';

    if (!hitResolution.evaded) {
      outcome = 'hit';
      const power = getStatValue(actor, Stat.POW);
      damage = calculateWeaponDamageImpl(weaponMassKg, power);
    }

    deductAp(combatant, cost.ap!);

    if (damage > 0) {
      decrementHp(targetActor, damage);
    }

    const combatantDidAttackEvent = createWorldEventImpl({
      type: EventType.COMBATANT_DID_ATTACK,
      location: actor.location,
      trace: trace,
      payload: {
        actor: actor.id,
        cost,
        target: combatant.target!,
        roll,
        damage,
        outcome,
        attackRating,
        evasionRating: defenderEvasionRating,
      },
    });

    const events: WorldEvent[] = [
      combatantDidAttackEvent,
    ];

    context.declareEvent(combatantDidAttackEvent);

    if (damage > 0 && targetActor.hp.eff.cur <= 0) {
      const deathEvent = createWorldEventImpl({
        type: EventType.COMBATANT_DID_DIE,
        location: actor.location,
        trace: trace,
        payload: {
          actor: combatant.target!,
        },
      });

      context.declareEvent(deathEvent);
      events.push(deathEvent);
    }

    return events;
  };
}
