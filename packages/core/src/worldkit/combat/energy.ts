import { Actor, Stat } from '~/types/entity/actor';
import { PotentiallyImpureOperations } from '~/types/handler';
import { Combatant, ActionCost } from '~/types/combat';
import { areaUnderCurve } from '~/lib/calculus';
import { BASELINE_STAT_VALUE, MAX_STAT_VALUE } from '~/worldkit/entity/actor/new-stats';
import { getStatValue } from '~/worldkit/entity/actor/new-stats';
import { extractApCost, extractEnergyCost } from '~/worldkit/combat/ap';

export const DEFAULT_CAPACITOR_ENERGY_PER_RES = 1000; // Base energy scaling factor
export const ENERGY_BASE_AT_MIN_RES = 10000; // Base energy at RES 10
export const ENERGY_MAX_AT_MAX_RES = 45600; // Maximum energy at RES 100
export const ENERGY_CURVE_EXPONENT = 0.7; // Power curve exponent for diminishing returns
export const DEFAULT_RECOVERY_RATE_PER_RES = 10; // Base recovery scaling factor
export const RECOVERY_BASE_AT_MIN_RES = 150; // Base recovery at RES 10 (150W)
export const RECOVERY_MAX_AT_MAX_RES = 500; // Maximum recovery at RES 100 (500W)
export const GOLDEN_RATIO_PEAK = 0.382; // φ⁻¹ (golden ratio conjugate)

export type EnergyComputationOptions = Partial<PotentiallyImpureOperations> & {
  energyBaseAtMinRes?: number;
  recoveryRatePerRes?: number;
  baselineRes?: number;
  maxRes?: number;
};

/**
 * Calculate maximum energy capacity from RES stat
 * Formula: E_capacity = base + (max - base) × ((RES - 10) / 90)^0.7
 * Power curve with diminishing returns: 10k J at RES 10, 45.6k J at RES 100
 */
export function calculateMaxEnergy(
  resilience: number,
  {
    energyBaseAtMinRes = ENERGY_BASE_AT_MIN_RES,
    baselineRes = BASELINE_STAT_VALUE,
    maxRes = MAX_STAT_VALUE,
  }: EnergyComputationOptions = {},
): number {
  // Clamp RES to valid range
  const clampedRES = Math.max(baselineRes, Math.min(maxRes, resilience));

  // Normalize RES 10-100 to 0-1 range
  const normalizedProgress = (clampedRES - baselineRes) / (maxRes - baselineRes);

  // Apply power curve for diminishing returns
  const curveProgress = Math.pow(normalizedProgress, ENERGY_CURVE_EXPONENT);

  // Calculate final energy capacity
  const energyRange = ENERGY_MAX_AT_MAX_RES - energyBaseAtMinRes;
  return energyBaseAtMinRes + (energyRange * curveProgress);
}

/**
 * Calculate gaussian recovery rate based on current energy level
 * Peaks at 38.2% of max energy (golden ratio conjugate)
 *
 * @param currentEnergy - Current energy in Joules
 * @param maxEnergy - Maximum energy capacity in Joules
 * @param maxRecoveryRate - Maximum recovery rate in Watts
 * @returns Recovery rate in Watts (Joules per second)
 */
export function calculateRecoveryRate(
  currentEnergy: number,
  maxEnergy: number,
  maxRecoveryRate: number,
): number {
  // Normalize current energy to 0-1 range
  const energyRatio = Math.max(0, Math.min(1, currentEnergy / maxEnergy));

    // Use a piecewise function that:
  // - Starts at GOLDEN_RATIO_PEAK (38.2%) when energyRatio = 0
  // - Peaks at 1.0 (100%) when energyRatio = GOLDEN_RATIO_PEAK (0.382)
  // - Decays exponentially to near-zero when energyRatio = 1

  let recoveryEfficiency: number;

  if (energyRatio <= GOLDEN_RATIO_PEAK) {
    // Rising portion: from 38.2% to 100%
    // f(t) = 0.382 + (1 - 0.382) * (t / peak)²
    const progress = energyRatio / GOLDEN_RATIO_PEAK;
    recoveryEfficiency = GOLDEN_RATIO_PEAK + (1 - GOLDEN_RATIO_PEAK) * Math.pow(progress, 2);
  } else {
    // Falling portion: exponential decay from peak to near-zero
    // Map energyRatio from [peak, 1] to [0, 1] for decay calculation
    const falloffRatio = (energyRatio - GOLDEN_RATIO_PEAK) / (1 - GOLDEN_RATIO_PEAK);

    // Exponential decay: e^(-k * x) where k controls steepness
    // k = 3 gives us about 5% recovery at t=1
    const decayConstant = 3;
    recoveryEfficiency = Math.exp(-decayConstant * falloffRatio);
  }

  const recoveryRate = maxRecoveryRate * recoveryEfficiency;

  return recoveryRate;
}

/**
 * Calculate maximum recovery rate from RES stat
 * Formula: R_max = base + (max - base) × ((RES - 10) / 90)^0.7
 * Power curve with diminishing returns: 150W at RES 10, 500W at RES 100
 */
export function calculateMaxRecoveryRate(
  resilience: number,
  {
    baselineRes = BASELINE_STAT_VALUE,
    maxRes = MAX_STAT_VALUE,
  }: EnergyComputationOptions = {},
): number {
  const clampedRes = Math.max(baselineRes, Math.min(maxRes, resilience));
  const normalizedProgress = (clampedRes - baselineRes) / (maxRes - baselineRes);

  // Apply power curve for diminishing returns
  const curveProgress = Math.pow(normalizedProgress, ENERGY_CURVE_EXPONENT);

  // Calculate final recovery rate
  const recoveryRange = RECOVERY_MAX_AT_MAX_RES - RECOVERY_BASE_AT_MIN_RES;
  const recoveryRate = RECOVERY_BASE_AT_MIN_RES + (recoveryRange * curveProgress);

  return Math.round(recoveryRate);
}

/**
 * Calculate initial energy value based on actor's capacitor position
 * Position (0-1) represents where the actor is on the energy spectrum
 */
export function calculateInitialEnergyValue(actor: Actor): number {
  const resilience = getStatValue(actor, Stat.RES);
  const maxEnergy = calculateMaxEnergy(resilience);
  const positionOnCurve = actor.capacitor.position ?? 1;
  const currentEnergy = maxEnergy * positionOnCurve;

  return Math.max(0, Math.min(maxEnergy, currentEnergy));
}

/**
 * Convert energy value to position on the recovery curve (0-1)
 */
export function energyToPosition(
  currentEnergy: number,
  maxEnergy: number
): number {
  return Math.max(0, Math.min(1, currentEnergy / maxEnergy));
}

/**
 * Convert position on recovery curve (0-1) to energy value
 */
export function positionToEnergy(
  position: number,
  maxEnergy: number
): number {
  const clampedPosition = Math.max(0, Math.min(1, position));
  return maxEnergy * clampedPosition;
}

/**
 * Calculate energy recovered over a time period using gaussian recovery curve integration
 *
 * @param initialEnergy - Starting energy in Joules
 * @param maxEnergy - Maximum energy capacity in Joules
 * @param maxRecoveryRate - Maximum recovery rate in Watts
 * @param timeInterval - Time period in milliseconds
 * @param integrationSteps - Number of integration steps (default 32)
 * @returns Energy recovered in Joules
 */
export function calculateEnergyRecoveryOverTime(
  initialEnergy: number,
  maxEnergy: number,
  maxRecoveryRate: number,
  timeInterval: number = 6_000, // 6 seconds
  integrationSteps: number = 32,
): number {
  // Create recovery rate function that changes as energy level changes over time
  const recoveryRateFunction = (t: number): number => {
    // Estimate energy level at time t (simplified linear recovery for integration)
    // In reality, this would be more complex as recovery rate affects energy level
    const estimatedEnergy = Math.min(maxEnergy, initialEnergy + (maxRecoveryRate * GOLDEN_RATIO_PEAK * t * timeInterval / 1_000));

    return calculateRecoveryRate(estimatedEnergy, maxEnergy, maxRecoveryRate);
  };

  // Integrate recovery rate over normalized time (0 to 1)
  const averageRecoveryRate = areaUnderCurve(recoveryRateFunction, 1.0, integrationSteps);

  // Convert to total energy recovered
  const energyRecovered = averageRecoveryRate * timeInterval;

  return Math.min(energyRecovered, maxEnergy - initialEnergy); // Can't exceed max capacity
}

/**
 * Check if combatant can afford an action cost
 */
export function canAffordCost(
  combatant: Combatant,
  cost: ActionCost,
): boolean {
  return canAffordActionCost(combatant, cost);
}

/**
 * Check if a combatant can afford an action cost
 */
export function canAffordActionCost(
  combatant: Combatant,
  cost: ActionCost,
): boolean {
  const sufficientAp = cost.ap ? combatant.ap.eff.cur >= extractApCost(cost) : true;
  const sufficientEnergy = cost.energy ? combatant.energy.eff.cur >= extractEnergyCost(cost) : true;
  return sufficientAp && sufficientEnergy;
}
