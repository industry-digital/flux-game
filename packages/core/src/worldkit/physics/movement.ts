import { MAX_STAT_VALUE } from '~/worldkit/entity/stats';
import { ACTOR_BASE_MASS } from '~/worldkit/physics/mass';


export type CalculateMovementTimeOptions = {
  crossoverDistance?: number;
  useDynamicCrossover?: boolean;
};

const DEFAULT_CROSSOVER_DISTANCE = 33;
const ACTOR_BASE_MASS_KG = ACTOR_BASE_MASS / 1_000;
const BASELINE_POWER_TO_MASS = MAX_STAT_VALUE / ACTOR_BASE_MASS_KG;

/**
 * Calculate dynamic crossover distance based on power-to-mass ratio
 * Higher power-to-mass ratio = shorter crossover (power dominates sooner)
 * Lower power-to-mass ratio = longer crossover (need more distance for power to matter)
 */
function calculateDynamicCrossoverDistance(
  power: number,
  mass: number,
  baselinePowerToMass: number = BASELINE_POWER_TO_MASS,
): number {
  const powerToMassRatio = power / mass;

  // Crossover distance inversely related to power-to-mass ratio
  // High P/M ratio (strong, light) → shorter crossover (15-25m)
  // Low P/M ratio (weak, heavy) → longer crossover (40-60m)
  const scalingFactor = baselinePowerToMass / powerToMassRatio;
  const dynamicCrossover = DEFAULT_CROSSOVER_DISTANCE * scalingFactor;

  // Clamp to reasonable bounds
  return Math.max(15, Math.min(60, dynamicCrossover));
}

export const DEFAULT_CALCULATE_MOVEMENT_TIME_OPTIONS: Readonly<CalculateMovementTimeOptions> = {
  crossoverDistance: DEFAULT_CROSSOVER_DISTANCE,
  useDynamicCrossover: true,
};

// Velocity-profile based movement with distinct FIN vs POW characteristics
export function calculateMovementTime(
  power: number,
  finesse: number,
  distance: number,
  mass: number,
  {
    crossoverDistance = DEFAULT_CROSSOVER_DISTANCE,
    useDynamicCrossover = true,
  }: CalculateMovementTimeOptions = DEFAULT_CALCULATE_MOVEMENT_TIME_OPTIONS,
): number {

  // Base velocities (m/s) - these create the distinct "feel"
  const finesseEfficiency = Math.sqrt(finesse / 100); // 10→0.32, 100→1.0
  const powerEfficiency = Math.sqrt(power / 100); // 10→0.32, 100→1.0

  // FIN: High peak velocity, decreases with distance (sprinter profile)
  // Calibrated so 100 FIN = ~12 m/s peak, 10 FIN = ~3.8 m/s peak (ordinary human walking)
  const finPeakVelocity = 12.0 * finesseEfficiency; // Up to 12 m/s peak (elite human sprint)
  const finDecayRate = 0.012; // Faster velocity decay per meter - FIN burns out quicker
  const finVelocity = finPeakVelocity * Math.exp(-finDecayRate * distance);

  // POW: Lower initial, MUCH higher sustained velocity (marathon runner profile)
  // Calibrated so 100 POW = ~14 m/s sustained, 10 POW = ~4.4 m/s sustained (ordinary human walking)
  const powSustainedVelocity = 14.0 * powerEfficiency; // Up to 14 m/s sustained (elite human endurance)
  const powBuildupRate = 0.03; // Faster velocity buildup per meter - POW ramps up quicker
  const powVelocity = powSustainedVelocity * (1 - Math.exp(-powBuildupRate * distance));

  // Use dynamic crossover if enabled
  const effectiveCrossoverDistance = useDynamicCrossover
    ? calculateDynamicCrossoverDistance(power, mass)
    : crossoverDistance;

  if (!effectiveCrossoverDistance) {
    throw new Error('Effective crossover distance is undefined');
  }

  // Smooth crossover weighting
  const distanceRatio = distance / effectiveCrossoverDistance;
  const finesseWeight = 1 / (1 + Math.pow(distanceRatio, 2));

  // Combined velocity profile
  const effectiveVelocity = finesseWeight * finVelocity + (1 - finesseWeight) * powVelocity;

  // Apply mass penalty
  const massMultiplier = mass / 70; // 70kg baseline
  const adjustedVelocity = effectiveVelocity / massMultiplier;

  // Convert to time (maintaining mathematical invariant)
  return distance / adjustedVelocity;
}

export function distanceToAp(
  power: number,
  finesse: number,
  distance: number,
  mass: number,
  options: CalculateMovementTimeOptions = DEFAULT_CALCULATE_MOVEMENT_TIME_OPTIONS,
): number {
  // Return unrounded high-precision time value
  return calculateMovementTime(power, finesse, distance, mass, options);
}

export type ApToDistanceOptions = CalculateMovementTimeOptions & {
  maxDistance: number;
  maxIterations: number;
};

const DEFAULT_AP_TO_DISTANCE_OPTIONS: Readonly<ApToDistanceOptions> = {
  maxDistance: 500,
  maxIterations: 60,
};

export function apToDistance(
  power: number,
  finesse: number,
  targetAp: number,
  mass: number,
  options: ApToDistanceOptions = DEFAULT_AP_TO_DISTANCE_OPTIONS,
): number {
  const { maxDistance, maxIterations } = options;
  // Binary search with high precision - no rounding in core calculation
  let low = 1, high = maxDistance;

  for (let i = 0; i < maxIterations; i++) { // More iterations for maximum precision
    const mid = (low + high) / 2;
    const ap = distanceToAp(power, finesse, mid, mass, options);

    const tolerance = 1e-10; // Even tighter tolerance for high precision
    if (Math.abs(ap - targetAp) < tolerance) return mid;

    if (ap < targetAp) low = mid;
    else high = mid;
  }

  return (low + high) / 2; // Return unrounded precise value
}

export type FormatApOptions = {
  precision: number;
};

export const DEFAULT_AP_OPTIONS: Readonly<FormatApOptions> = {
  precision: 1,
};

/**
 * Format AP value for presentation purposes
 * Rounds to 0.1 AP precision for combat system consistency
 * DO NOT round values for calculations that are *internal to this module*.
 */
export function formatAp(ap: number, options: FormatApOptions = DEFAULT_AP_OPTIONS): number {
  const p = Math.pow(10, options.precision);
  return Math.round(ap * p) / p;
}

export type FormatDistanceOptions = {
  precision: number;
};

export const DEFAULT_DISTANCE_OPTIONS: FormatDistanceOptions = {
  precision: 2,
};

/**
 * Format distance value for presentation purposes
 * Rounds to reasonable precision for display
 * DO NOT round values for calculations that are *internal to this module*.
 */
export function formatDistance(distance: number, options: FormatDistanceOptions = DEFAULT_DISTANCE_OPTIONS): number {
  const p = Math.pow(10, options.precision);
  return Math.round(distance * p) / p;
}
