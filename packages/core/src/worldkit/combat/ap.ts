import { Actor } from '~/types/entity/actor';
import { PotentiallyImpureOperations } from '~/types/handler';
import { ActionCost, Combatant } from '~/types/combat';
import { TACTICAL_AP_PRECISION_FACTOR } from '~/worldkit/combat/tactical-rounding';
import { WeaponSchema, WeaponTimer } from '~/types/schema/weapon';
import { getEffectiveSkillRank, MAX_SKILL_RANK } from '~/worldkit/entity/actor/skill';

export const TURN_DURATION_SECONDS = 6;
export const MAX_AP = TURN_DURATION_SECONDS;
export const DEFAULT_BASE_AP = TURN_DURATION_SECONDS;
export const DEFAULT_ATTACK_AP_COST = 2.0;
export const DEFAULT_MOVEMENT_AP_COST = 1.0; // Distance depends on actor's Shell stats

/**
 * Used to signal that all remaining AP should be used
 */
export const ALL_REMAINING_AP = -1;

export type ApCalculationOptions = Partial<PotentiallyImpureOperations> & {
  baseAp?: number;
};

export const DEFAULT_AP_CALCULATION_OPTIONS: ApCalculationOptions = {
  baseAp: DEFAULT_BASE_AP,
};

/**
 * Calculate maximum AP pool (fixed at 6.0 for all actors)
 * Formula: Fixed 6.0 AP per turn
 * In the future, we may
 */
export function calculateMaxAp(
  actor: Actor,
  {
    baseAp = DEFAULT_BASE_AP,
  }: ApCalculationOptions = DEFAULT_AP_CALCULATION_OPTIONS,
): number {
  return baseAp;
}

export function extractApCost(cost: ActionCost): number {
  return cost.ap ?? 0;
}

export function extractEnergyCost(cost: ActionCost): number {
  return cost.energy ?? 0;
}

/**
 * Clean up floating-point precision artifacts by rounding to nearest 0.1
 *
 * Unlike roundApCostUp (which always rounds up), this rounds to the nearest
 * 0.1 to clean up precision artifacts while preserving the intended value.
 */
export function cleanApPrecision(ap: number): number {
  return Math.round(ap * TACTICAL_AP_PRECISION_FACTOR) / TACTICAL_AP_PRECISION_FACTOR;
}

export function getCurrentAp(combatant: Combatant): number {
  return combatant.ap.current;
}

export function getMaxAp(combatant: Combatant): number {
  return combatant.ap.max;
}

export function setCurrentAp(combatant: Combatant, ap: number): void {
  combatant.ap.current = ap;
}

/**
 * Deduct AP from combatant
 * Directly mutates combatant state
 *
 * Note: AP should already be tactically rounded by the caller using
 * the tactical cost factory functions. This function applies precision
 * cleanup to handle floating-point arithmetic errors.
 */
export function deductAp(combatant: Combatant, ap: number): void {
  const precisionError = Math.abs(ap - cleanApPrecision(ap));
  if (precisionError > 0.001) {
    throw new Error(`AP deduction precision violation: ${ap} is not a multiple of 0.1. Use tactical cost factories to ensure proper rounding.`);
  }

  // Clean up precision artifacts in both values to prevent floating-point comparison issues
  const cleanAp = cleanApPrecision(ap);
  const cleanCurrentAp = cleanApPrecision(combatant.ap.current);

  if (cleanAp > cleanCurrentAp) {
    throw new Error(`Cannot deduct ${cleanAp} AP from combatant ${combatant.actorId} - not enough AP (has ${cleanCurrentAp})`);
  }

  const newAp = cleanCurrentAp - cleanAp;
  combatant.ap.current = newAp;
}

/**
 * Restore AP to full
 * Directly mutates combatant state
 */
export function restoreApToFull(combatant: Combatant): void {
  combatant.ap.current = combatant.ap.max;
}

const MAX_AP_REDUCTION_FACTOR = 0.5;

/**
 * Calculate ranged weapon action cost with skill-based timer reduction
 *
 * Skill scaling reduces action time:
 * - Skill rank 0: Full timer duration (no reduction)
 * - Skill rank 100: 50% timer reduction (maximum efficiency)
 * - Linear scaling: time = baseTime * (1 - skillRank/200)
 *
 * @param actor - The actor using the weapon
 * @param weapon - The weapon being used
 * @param timer - The timer to calculate the AP cost
 * @returns Action cost in seconds, reduced by skill proficiency
 */
export function calculateWeaponApCost(actor: Actor, weapon: WeaponSchema, timer: WeaponTimer): number {
  // @ts-expect-error - weapon.timers is a union type
  const baseTimerMs = weapon.timers[timer];
  if (baseTimerMs === undefined) {
    throw new Error(`Weapon ${weapon.urn} must have a timer specified for ${timer}`);
  }

  // Get actor's effective skill rank (includes modifiers)
  const effectiveSkillRank = getEffectiveSkillRank(actor, weapon.skill);

  // Calculate skill reduction factor (0% to 50% reduction)
  // Formula: reduction = (skillRank / MAX_SKILL_RANK) * 0.5
  const skillReductionFactor = (effectiveSkillRank / MAX_SKILL_RANK) * MAX_AP_REDUCTION_FACTOR;

  // Apply reduction: finalTime = baseTime * (1 - reductionFactor)
  const reducedTimerMs = baseTimerMs * (1 - skillReductionFactor);

  // Convert milliseconds to seconds for AP system
  return reducedTimerMs / 1_000;
}
