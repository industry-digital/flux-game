import { Actor } from '~/types/entity/actor';
import { PotentiallyImpureOperations } from '~/types/handler';
import { BASELINE_STAT_VALUE, NORMAL_STAT_RANGE } from '~/worldkit/entity/actor/stats';
import { GOLDEN_RATIO } from '~/types/world/constants';
import { ActionCost, Combatant } from '~/types/combat';
import { TACTICAL_AP_PRECISION_FACTOR } from '~/worldkit/combat/tactical-rounding';

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
  statRange?: number;
  baseStatValue?: number;
};

export const DEFAULT_AP_CALCULATION_OPTIONS: ApCalculationOptions = {
  baseAp: DEFAULT_BASE_AP,
  statRange: NORMAL_STAT_RANGE,
  baseStatValue: BASELINE_STAT_VALUE,
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
    statRange = NORMAL_STAT_RANGE,
    baseStatValue = BASELINE_STAT_VALUE,
  }: ApCalculationOptions = DEFAULT_AP_CALCULATION_OPTIONS,
): number {
  // Logarithmic growth from INT 10 to 100
  const intAboveBaseline = Math.max(0, actor.stats.int.eff - baseStatValue);
  const normalizedInt = intAboveBaseline / statRange; // 0 to 1

  // Logarithmic scaling factor (0 to 1)
  const logFactor = Math.log(1 + normalizedInt * (Math.E - 1)) / Math.log(Math.E);

  // Scale from base (6.0) to max (6.0 * φ)
  const maxAp = baseAp * GOLDEN_RATIO;
  return baseAp + (maxAp - baseAp) * logFactor;
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
  const cleanCurrentAp = cleanApPrecision(combatant.ap.eff.cur);

  if (cleanAp > cleanCurrentAp) {
    throw new Error(`Cannot deduct ${cleanAp} AP from combatant ${combatant.actorId} - not enough AP (has ${cleanCurrentAp})`);
  }

  const newAp = cleanCurrentAp - cleanAp;
  combatant.ap.eff.cur = newAp;
  combatant.ap.nat.cur = newAp;
}

/**
 * Restore AP to full
 * Directly mutates combatant state
 */
export function restoreApToFull(combatant: Combatant): void {
  const newAp = combatant.ap.eff.max;
  combatant.ap.eff.cur = newAp;
  combatant.ap.nat.cur = newAp;
}
