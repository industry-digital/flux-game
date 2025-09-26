/**
 * Primitive Strike Action
 *
 * Direct weapon attack without AI planning - for expert manual control.
 * This is the "primitive" action that provides precise control over individual attacks.
 * Contains the core hit mechanics that AI-assisted attacks delegate to.
 */

import { Actor } from '~/types/entity/actor';
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
import { renderAttackNarrative } from '~/worldkit/narrative/combat/attack-narrative';
import { calculateAttackRating } from '~/worldkit/combat/attack';
import { decrementHp } from '~/worldkit/entity/actor/health';
import { getEffectiveSkillRank } from '~/worldkit/entity/actor/skill';

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
    // Handle target parameter - update persistent target if provided
    if (target) {
      combatant.target = target;
    }

    // Require existing target if none provided
    if (!combatant.target) {
      declareError(
        'No target selected. Use "target <name>" or "strike <name>" to select a target first.',
        trace
      );
      return [];
    }

    // 1. Validate prerequisites (pure checks, no state changes yet)
    const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);
    if (!weapon) {
      declareError('You don\'t have a weapon equipped.', trace);
      return [];
    }

    // Resolve weapon mass from schema (convert grams to kg)
    if (!weapon.baseMass || weapon.baseMass <= 0) {
      throw new Error(`Invalid weapon mass: ${weapon.baseMass}g. Weapon must have positive baseMass.`);
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

    // Calculate tactical AP cost using factory (includes rounding)
    const cost: ActionCost = createStrikeCostImpl(weaponMassKg, actor.stats.fin.eff);

    if (cost.ap! > combatant.ap.eff.cur) {
      declareError(`You don't have enough AP to strike.`, trace);
      return [];
    }

    // 2. Execute single deterministic roll (this handles RNG internally)
    const { values, sum: natural } = context.rollDice(ATTACK_ROLL_SPECIFICATION, context.random);
    const roll: RollResult = {
      dice: ATTACK_ROLL_SPECIFICATION,
      values,
      mods: {},
      natural,
      result: natural, // No modifiers for basic strike
    };

    // 3. Calculate all values deterministically (no random calls)
    const targetActor = context.world.actors[combatant.target!];
    // Use combat mass API for consistency with physics calculations (returns kg)
    const defenderEvasionRating = calculateActorEvasionRatingImpl(
      targetActor,
      computeCombatMass,
    );

    // 4. Calculate skill-based attack rating
    const attackRating = calculateAttackRatingImpl(actor, weapon, roll.result);

    // 5. Resolve hit/miss deterministically using skill-enhanced rating
    const hitResolution = resolveHitAttemptImpl(
      defenderEvasionRating,
      attackRating,
      targetCombatant.energy.position,
      context, //--> ASSUMPTION: context contains necessary dependencies
    );

    // 5. Calculate damage deterministically using mass-based linear system
    let damage = 0;
    let outcome: 'hit' | 'miss' | 'hit:critical' | 'miss:critical' = 'miss';

    if (!hitResolution.evaded) {
      outcome = 'hit';

      // Calculate damage using new mass-based linear system
      damage = calculateWeaponDamageImpl(weaponMassKg, actor.stats.pow.eff);
    }

    // 6. Apply all state changes atomically
    deductAp(combatant, cost.ap!);

    if (damage > 0) {
      // Apply damage to the target actor's HP
      decrementHp(targetActor, damage);
    }

    // 7. Generate narrative for the attack
    const narrative = renderAttackNarrative(actor, targetActor, weapon, outcome);

    const combatantDidAttackEvent = createWorldEventImpl({
      type: EventType.COMBATANT_DID_ATTACK,
      location: actor.location,
      trace: trace,
      narrative,
      payload: {
        actor: actor.id,
        cost,
        target: combatant.target!,
        roll,
        outcome,
        damage,
        attackRating,
        evasionRating: defenderEvasionRating,
      },
    });

    const events: WorldEvent[] = [
      combatantDidAttackEvent,
    ];

    context.declareEvent(combatantDidAttackEvent);

    // 9. Check for death immediately after applying damage
    if (damage > 0 && targetActor.hp.eff.cur <= 0) {
      // Create death event directly since we know the target just died from our damage
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
