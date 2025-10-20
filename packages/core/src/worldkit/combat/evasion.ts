import { Actor, Stat } from '~/types/entity/actor';
import { PotentiallyImpureOperations } from '~/types/handler';
import { getActorSkill, MAX_SKILL_RANK } from '~/worldkit/entity/actor/skill';
import { getStatValue } from '~/worldkit/entity/actor/stats';
import { calculateInertialMass, calculatePeakPowerOutput } from '~/worldkit/physics/physics';

/**
 * Hit Resolution System
 *
 * Implements contested hit resolution where evasion success depends on
 * defender capabilities vs attacker rating, with energy-dependent efficiency.
 */

// Constants for evasion rating calculation
export const EVASION_STATS_BASELINE = 0.05; // 5% minimum from stats
export const EVASION_STATS_WEIGHT = 0.67; // 67% max from stats (POW/FIN)
export const EVASION_SKILL_WEIGHT = 0.33; // 33% max from skills

// Constants for mass-dependent sigmoid curve
export const SIGMOID_BASE_MASS = 70; // kg - reference mass for scaling
export const SIGMOID_MIDPOINT_BASE = 20; // Base power-to-mass midpoint
export const SIGMOID_STEEPNESS_BASE = 0.2; // Base steepness parameter
// Mass scaling exponents: midpoint^1.2, steepness^0.8 for severe penalties

// Constants for base evasion probability
export const BASE_EVASION_EQUAL_RATINGS = 0.50; // 50% when ratings are equal
export const RATING_ADVANTAGE_RANGE = 50; // +50 rating points = 100% evasion

// Constants for capacitor efficiency
export const GOLDEN_RATIO_PEAK = 0.382; // φ⁻¹ (golden ratio conjugate)
export const PEAK_EFFICIENCY = 0.618; // 61.8% efficiency at golden ratio peak

/**
 * Calculate defender's evasion rating from stats and skills
 * @param powerOutput - The actor's peak power output in Watts. Not the POW stat!
 * @param effectiveMass - The actor's effective mass in kilograms
 * @param naturalMass - The actor's natural mass in kilograms
 * @param evasionSkillLevel - The actor's evasion skill level in percent; 0-100 normalized
 */
export function calculateDefenderEvasionRating(
  powerOutput: number,
  effectiveMass: number,
  naturalMass: number,
  evasionSkillLevel: number // 0-100 normalized
): number {
  // Stats component: mass-dependent sigmoid curve capped at 67 points
  const statsComponent = calculateStatsEvasionComponent(powerOutput, effectiveMass, naturalMass);

  // Skill component: linear progression to 33 points
  const skillComponent = (evasionSkillLevel / MAX_SKILL_RANK) * EVASION_SKILL_WEIGHT * 100;

  return Math.min(statsComponent + skillComponent, 100);
}

/**
 * Calculate stats-based evasion component (0-67 points)
 * Uses mass-dependent sigmoid curve for better mass penalty scaling
 */
function calculateStatsEvasionComponent(
  powerOutput: number,
  effectiveMass: number,
  naturalMass: number,
  attackDuration: number = 0.25
): number {
  const powerToMassRatio = powerOutput / effectiveMass;

  // Mass-dependent sigmoid parameters
  const massRatio = naturalMass / SIGMOID_BASE_MASS;

  // Heavier actors need much higher power-to-mass ratios to achieve same evasion
  const midpoint = SIGMOID_MIDPOINT_BASE * Math.pow(massRatio, 1.2); // Increased to 1.2 for severe penalty

  // Heavier actors have much less steep curves (much harder to reach maximum evasion)
  const steepness = SIGMOID_STEEPNESS_BASE / Math.pow(massRatio, 0.8); // Increased to 0.8

  // Duration scaling (faster attacks are harder to evade)
  const durationScaledMidpoint = midpoint * Math.pow(0.25 / attackDuration, 2);

  // Sigmoid curve: smooth transition from baseline to cap
  const sigmoidValue = 1 / (1 + Math.exp(-steepness * (powerToMassRatio - durationScaledMidpoint)));
  const normalizedEvasion = EVASION_STATS_BASELINE + (EVASION_STATS_WEIGHT - EVASION_STATS_BASELINE) * sigmoidValue;

  // Convert to rating points (0-67)
  return normalizedEvasion * 100;
}

/**
 * Calculate base evasion probability from rating difference
 * Uses asymmetric curve: linear growth for advantages, quadratic decline for disadvantages
 */
export function calculateBaseEvasionProbability(
  ratingDifference: number // defenderRating - attackerRating
): number {
  if (ratingDifference >= 0) {
    // Right side: gentle linear from 33% to 100% over 0 to +50 points
    const progress = Math.min(ratingDifference / RATING_ADVANTAGE_RANGE, 1);
    return BASE_EVASION_EQUAL_RATINGS + (1 - BASE_EVASION_EQUAL_RATINGS) * progress;
  }

  // Left side: explosive quadratic decline from 33% to 0% over 0 to -50 points
  const progress = Math.min(Math.abs(ratingDifference) / RATING_ADVANTAGE_RANGE, 1);
  const explosiveDecline = Math.pow(1 - progress, 2); // Quadratic curve
  return BASE_EVASION_EQUAL_RATINGS * explosiveDecline;
}

/**
 * Calculate evasion efficiency based on capacitor position
 * Integrates with golden ratio energy recovery curve
 */
export function calculateEvasionEfficiency(
  capacitorPosition: number // Position 0.0 to 1.0 on easing curve; matches energy  system
): number {
  // Validate input range
  const clampedPosition = Math.max(0, Math.min(1, capacitorPosition));

  if (clampedPosition >= GOLDEN_RATIO_PEAK) {
    // Right side: linear from 61.8% at peak to 100% at full
    const progress = (clampedPosition - GOLDEN_RATIO_PEAK) / (1 - GOLDEN_RATIO_PEAK);
    return PEAK_EFFICIENCY + (1 - PEAK_EFFICIENCY) * progress;
  }

  // Left side: quadratic decline toward zero
  const progress = clampedPosition / GOLDEN_RATIO_PEAK; // 0 to 1
  const quadraticDecline = Math.pow(progress, 2);
  return PEAK_EFFICIENCY * quadraticDecline;
}

/**
 * Hit resolution result
 */
export interface HitResolutionResult {
  evaded: boolean;
  evasionChance: number;
  efficiency: number;
  ratingDifference: number;
  /**
   * Random number generator value (0.0-1.0) used for probability resolution
   */
  rngValue: number;
}

export type HitResolutionDependencies = Pick<PotentiallyImpureOperations, 'random'>;

export const DEFAULT_RESOLVE_HIT_ATTEMPT_OPTIONS: Readonly<HitResolutionDependencies> = {
  random: () => Math.random(),
};

/**
 * Complete hit resolution with all factors
 * Single entry point for all hit resolution in combat
 */
export function resolveHitAttempt(
  defenderEvasionRating: number,
  attackerAttackRating: number,
  capacitorPosition: number,
  deps: HitResolutionDependencies = DEFAULT_RESOLVE_HIT_ATTEMPT_OPTIONS,
): HitResolutionResult {
  // Calculate rating difference
  const ratingDifference = defenderEvasionRating - attackerAttackRating;

  // Calculate base evasion probability
  const baseEvasionChance = calculateBaseEvasionProbability(ratingDifference);

  // Calculate capacitor efficiency
  const efficiency = calculateEvasionEfficiency(capacitorPosition);

  // Apply efficiency to base evasion chance
  const finalEvasionChance = Math.min(baseEvasionChance * efficiency, 0.99);

  // Generate RNG value for resolution (0-1 range)
  const rngValue = deps.random();
  const evaded = rngValue < finalEvasionChance;

  return {
    evaded,
    evasionChance: finalEvasionChance,
    efficiency,
    ratingDifference,
    rngValue
  };
}

/**
 * Utility: Calculate expected evasion chance without rolling
 * Useful for UI display and tactical planning
 */
export function calculateExpectedEvasion(
  defenderEvasionRating: number,
  attackerAttackRating: number,
  evasionEfficiency: number = 1.0
): { evasionChance: number; ratingDifference: number } {
  const ratingDifference = defenderEvasionRating - attackerAttackRating;
  const baseEvasionChance = calculateBaseEvasionProbability(ratingDifference);
  const finalEvasionChance = Math.min(baseEvasionChance * evasionEfficiency, 0.99);

  return {
    evasionChance: finalEvasionChance,
    ratingDifference
  };
}

export function calculateActorEvasionRating(
  actor: Actor,
  computeActorMass: (actor: Actor) => number,
): number {
  const evasionSkill = getActorSkill(actor, 'flux:schema:skill:evasion');
  const naturalMass = computeActorMass(actor);
  const finesse = getStatValue(actor, Stat.FIN);
  const power = getStatValue(actor, Stat.POW);
  const effectiveMass = calculateInertialMass(finesse, naturalMass);
  const powerOutput = calculatePeakPowerOutput(power);

  return calculateDefenderEvasionRating(
    powerOutput,
    effectiveMass,
    naturalMass,
    evasionSkill.rank,
  );
}
