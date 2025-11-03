/**
 * Primitive Strike Action
 *
 * Direct weapon attack without AI planning - for expert manual control.
 * This is the "primitive" action that provides precise control over individual attacks.
 * Contains the core hit mechanics that AI-assisted attacks delegate to.
 */

import { Actor } from '~/types/entity/actor';
import { CombatSession, computeDistanceBetweenCombatants, canWeaponHitFromDistance } from '~/worldkit/combat';
import { ActionCost, AttackType, AttackOutcome, Combatant } from '~/types/combat';
import { EventType, WorldEvent } from '~/types/event';
import { calculateActorEvasionRating, resolveHitAttempt } from '~/worldkit/combat/evasion';
import { createWorldEvent } from '~/worldkit/event';
import { ActorURN } from '~/types/taxonomy';
import { deductAp } from '~/worldkit/combat/combatant';
import { TransformerContext } from '~/types/handler';
import { createStrikeCost } from '~/worldkit/combat/tactical-cost';
import { decrementHp } from '~/worldkit/entity/actor/health';
import { WeaponTimer } from '~/types/schema/weapon';

export type StrikeDependencies = {
  createWorldEvent?: typeof createWorldEvent;
  resolveHitAttempt?: typeof resolveHitAttempt;
  calculateActorEvasionRating?: typeof calculateActorEvasionRating;
  computeDistanceBetweenCombatants?: typeof computeDistanceBetweenCombatants;
  canWeaponHitFromDistance?: typeof canWeaponHitFromDistance;
  createStrikeCost?: typeof createStrikeCost;
};

export const DEFAULT_STRIKE_DEPS: Readonly<StrikeDependencies> = {
  createWorldEvent,
  resolveHitAttempt,
  calculateActorEvasionRating,
  computeDistanceBetweenCombatants,
  canWeaponHitFromDistance,
  createStrikeCost,
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
    computeDistanceBetweenCombatants: computeDistanceBetweenCombatantsImpl = computeDistanceBetweenCombatants,
    canWeaponHitFromDistance: canWeaponHitFromDistanceImpl = canWeaponHitFromDistance,
    createStrikeCost: createStrikeCostImpl = createStrikeCost,
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

    const cost: ActionCost = createStrikeCostImpl(actor, weapon, WeaponTimer.ATTACK);
    if (cost.ap! > combatant.ap.eff.cur) {
      declareError(`You don't have enough AP to strike.`, trace);
      return [];
    }

    // Use RollApi for accuracy calculation
    const accuracyRoll = context.rollApi.rollWeaponAccuracy(actor, weapon);
    const attackRating = accuracyRoll.result;

    const targetActor = context.world.actors[combatant.target!];
    const defenderEvasionRating = calculateActorEvasionRatingImpl(
      targetActor,
      computeCombatMass,
    );

    const hitResolution = resolveHitAttemptImpl(
      defenderEvasionRating,
      attackRating,
      targetCombatant.energy.position,
      context, //--> ASSUMPTION: context contains necessary dependencies
    );

    let damage = 0;
    let outcome: AttackOutcome = AttackOutcome.MISS;

    if (!hitResolution.evaded) {
      outcome = AttackOutcome.HIT;
      // Use RollApi for damage calculation
      const damageRoll = context.rollApi.rollWeaponDamage(actor, weapon);
      damage = damageRoll.result;
    }

    deductAp(combatant, cost.ap!);

    if (damage > 0) {
      decrementHp(targetActor, damage);
    }

    // Create COMBATANT_DID_ATTACK event (attacker's perspective)
    const combatantDidAttackEvent = createWorldEventImpl({
      trace: trace,
      type: EventType.ACTOR_DID_ATTACK,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: {
        target: combatant.target!,
        attackType: AttackType.STRIKE,
        cost,
        roll: accuracyRoll,
        attackRating,
      },
    });

    // Create COMBATANT_WAS_ATTACKED event (target's perspective)
    const combatantWasAttackedEvent = createWorldEventImpl({
      trace: trace,
      type: EventType.ACTOR_WAS_ATTACKED,
      actor: combatant.target!,
      location: targetActor.location,
      session: session.id,
      payload: {
        source: actor.id,
        type: AttackType.STRIKE,
        outcome,
        attackRating,
        evasionRating: defenderEvasionRating,
        damage,
      },
    });

    const events: WorldEvent[] = [
      combatantDidAttackEvent,
      combatantWasAttackedEvent,
    ];

    context.declareEvent(combatantDidAttackEvent);
    context.declareEvent(combatantWasAttackedEvent);

    if (damage > 0 && targetActor.hp.eff.cur <= 0) {
      const deathEvent = createWorldEventImpl({
        trace: trace,
        type: EventType.ACTOR_DID_DIE,
        actor: combatant.target!,
        location: actor.location,
        session: session.id,
        payload: {
          killer: actor.id,
        },
      });

      context.declareEvent(deathEvent);
      events.push(deathEvent);
    }

    return events;
  };
}
