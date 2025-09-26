import { Actor } from '~/types/entity/actor';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { ActorStat } from '~/types/entity/actor';
import { getActorStat, BASELINE_STAT_VALUE, MAX_STAT_VALUE } from '~/worldkit/entity/actor/stats';

/**
 * Pure functions for actor energy management
 * All functions take Actor as first parameter following functional programming conventions
 */

// ============================================================================
// ENERGY SYSTEM CONSTANTS (migrated from combat/energy.ts)
// ============================================================================

export const DEFAULT_CAPACITOR_ENERGY_PER_RES = 1000; // Base energy scaling factor
export const ENERGY_BASE_AT_MIN_RES = 10000; // Base energy at RES 10
export const ENERGY_MAX_AT_MAX_RES = 45600; // Maximum energy at RES 100
export const ENERGY_CURVE_EXPONENT = 0.7; // Power curve exponent for diminishing returns
export const DEFAULT_RECOVERY_RATE_PER_RES = 10; // Base recovery scaling factor
export const RECOVERY_BASE_AT_MIN_RES = 150; // Base recovery at RES 10 (150W)
export const RECOVERY_MAX_AT_MAX_RES = 500; // Maximum recovery at RES 100 (500W)
export const GOLDEN_RATIO_PEAK = 0.382; // φ⁻¹ (golden ratio conjugate)

export type EnergyComputationOptions = {
  energyBaseAtMinRes?: number;
  recoveryRatePerRes?: number;
  baselineRes?: number;
  maxRes?: number;
};

/**
 * Get current energy value in Joules
 */
export function getCurrentEnergy(actor: Actor): number {
  return actor.capacitor?.energy.eff.cur ?? 0;
}

/**
 * Get maximum energy capacity in Joules based on resilience
 */
export function getMaxEnergy(actor: Actor): number {
  const resilience = getActorStat(actor, ActorStat.RES).eff;
  return calculateMaxEnergy(resilience);
}

/**
 * Get current position on recovery curve (0-1)
 */
export function getPosition(actor: Actor): NormalizedValueBetweenZeroAndOne {
  return actor.capacitor?.position ?? 1.0;
}

/**
 * Set position on recovery curve (0-1) and update energy accordingly
 */
export function setPosition(actor: Actor, position: NormalizedValueBetweenZeroAndOne): void {
  initializeCapacitorIfNeeded(actor);
  const maxEnergy = getMaxEnergy(actor);
  const clampedPosition = Math.max(0, Math.min(1, position));
  const energy = positionToEnergy(clampedPosition, maxEnergy);

  actor.capacitor!.position = clampedPosition;
  actor.capacitor!.energy.eff.cur = energy;
  actor.capacitor!.energy.nat.cur = energy;
  actor.capacitor!.energy.eff.max = maxEnergy;
  actor.capacitor!.energy.nat.max = maxEnergy;
}

/**
 * Set energy directly in Joules (updates position accordingly)
 */
export function setEnergy(actor: Actor, energy: number): void {
  initializeCapacitorIfNeeded(actor);

  const maxEnergy = getMaxEnergy(actor);
  const clampedEnergy = Math.max(0, Math.min(maxEnergy, energy));
  const position = energyToPosition(clampedEnergy, maxEnergy);

  actor.capacitor!.energy.eff.cur = clampedEnergy;
  actor.capacitor!.energy.nat.cur = clampedEnergy;
  actor.capacitor!.energy.eff.max = maxEnergy;
  actor.capacitor!.energy.nat.max = maxEnergy;
  actor.capacitor!.position = position;
}

/**
 * Get maximum recovery rate in Watts based on resilience
 */
export function getMaxRecoveryRate(actor: Actor): number {
  const resilience = getActorStat(actor, ActorStat.RES).eff;
  return calculateMaxRecoveryRate(resilience);
}

/**
 * Get current recovery rate in Watts based on position on recovery curve
 */
export function getCurrentRecoveryRate(actor: Actor): number {
  const currentEnergy = getCurrentEnergy(actor);
  const maxEnergy = getMaxEnergy(actor);
  const maxRecoveryRate = getMaxRecoveryRate(actor);
  return calculateRecoveryRate(currentEnergy, maxEnergy, maxRecoveryRate);
}

/**
 * Consume energy (reduces current energy) in Joules
 */
export function consumeEnergy(actor: Actor, amount: number): void {
  const currentEnergy = getCurrentEnergy(actor);
  const newEnergy = Math.max(0, currentEnergy - amount);
  setEnergy(actor, newEnergy);
}

/**
 * Compute the amount of energy that would be recovered over a time period
 * Pure function - does not mutate actor state
 * Now uses sophisticated integration-based recovery calculation
 */
export function computeRecoveryEnergy(actor: Actor, timeMs: number): number {
  const currentEnergy = getCurrentEnergy(actor);
  const maxEnergy = getMaxEnergy(actor);
  const maxRecoveryRate = getMaxRecoveryRate(actor);
  const deltaTimeSeconds = timeMs / 1000;

  return calculateEnergyRecoveryOverTime(currentEnergy, maxEnergy, maxRecoveryRate, deltaTimeSeconds);
}

/**
 * Recover energy over time period and mutate actor state
 * Returns the amount of energy actually recovered in Joules
 */
export function recoverEnergy(actor: Actor, timeMs: number): number {
  const energyRecovered = computeRecoveryEnergy(actor, timeMs);
  const currentEnergy = getCurrentEnergy(actor);
  const maxEnergy = getMaxEnergy(actor);
  const newEnergy = Math.min(maxEnergy, currentEnergy + energyRecovered);

  setEnergy(actor, newEnergy);

  // Return only the amount actually recovered (clamped)
  return newEnergy - currentEnergy;
}

/**
 * Check if actor can afford energy cost in Joules
 */
export function canAfford(actor: Actor, cost: number): boolean {
  return getCurrentEnergy(actor) >= cost;
}

/**
 * Get energy as percentage of max (0-1)
 */
export function getEnergyPercentage(actor: Actor): NormalizedValueBetweenZeroAndOne {
  const current = getCurrentEnergy(actor);
  const max = getMaxEnergy(actor);
  return max > 0 ? (current / max) : 0;
}

// Helper functions

function initializeCapacitorIfNeeded(actor: Actor): void {
  if (!actor.capacitor) {
    actor.capacitor = {
      position: 1.0,
      energy: {
        nat: { cur: 0, max: 0 },
        eff: { cur: 0, max: 0 },
        mods: {}
      }
    };
  }
}

/**
 * Calculate maximum energy capacity from RES stat (migrated from combat/energy.ts)
 * Formula: E_capacity = base + (max - base) × ((RES - 10) / 90)^0.7
 * Power curve with diminishing returns: 10k J at RES 10, 45.6k J at RES 100
 */
function calculateMaxEnergy(
  resilience: number,
): number {
  // Clamp RES to valid range
  const clampedRES = Math.max(BASELINE_STAT_VALUE, Math.min(MAX_STAT_VALUE, resilience));

  // Normalize RES 10-100 to 0-1 range
  const normalizedProgress = (clampedRES - BASELINE_STAT_VALUE) / (MAX_STAT_VALUE - BASELINE_STAT_VALUE);

  // Apply power curve for diminishing returns
  const curveProgress = Math.pow(normalizedProgress, ENERGY_CURVE_EXPONENT);

  // Calculate final energy capacity
  const energyRange = ENERGY_MAX_AT_MAX_RES - ENERGY_BASE_AT_MIN_RES;
  return ENERGY_BASE_AT_MIN_RES + (energyRange * curveProgress);
}

/**
 * Calculate maximum recovery rate from RES stat (migrated from combat/energy.ts)
 * Formula: R_max = base + (max - base) × ((RES - 10) / 90)^0.7
 * Power curve with diminishing returns: 150W at RES 10, 500W at RES 100
 */
function calculateMaxRecoveryRate(
  resilience: number,
): number {
  const clampedRes = Math.max(BASELINE_STAT_VALUE, Math.min(MAX_STAT_VALUE, resilience));
  const normalizedProgress = (clampedRes - BASELINE_STAT_VALUE) / (MAX_STAT_VALUE - BASELINE_STAT_VALUE);

  // Apply power curve for diminishing returns
  const curveProgress = Math.pow(normalizedProgress, ENERGY_CURVE_EXPONENT);

  // Calculate final recovery rate
  const recoveryRange = RECOVERY_MAX_AT_MAX_RES - RECOVERY_BASE_AT_MIN_RES;
  const recoveryRate = RECOVERY_BASE_AT_MIN_RES + (recoveryRange * curveProgress);

  return Math.round(recoveryRate);
}

/**
 * Calculate gaussian recovery rate based on current energy level (migrated from combat/energy.ts)
 * Peaks at 38.2% of max energy (golden ratio conjugate)
 *
 * @param currentEnergy - Current energy in Joules
 * @param maxEnergy - Maximum energy capacity in Joules
 * @param maxRecoveryRate - Maximum recovery rate in Watts
 * @returns Recovery rate in Watts (Joules per second)
 */
function calculateRecoveryRate(
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
 * Calculate energy recovery over time using integration (migrated from combat/energy.ts)
 * Uses numerical integration to handle the changing recovery rate as energy increases
 *
 * @param currentEnergy - Starting energy in Joules
 * @param maxEnergy - Maximum energy capacity in Joules
 * @param maxRecoveryRate - Maximum recovery rate in Watts
 * @param deltaTimeSeconds - Time duration in seconds
 * @param integrationSteps - Number of integration steps for numerical accuracy (default: 16)
 * @returns Energy recovered in Joules
 */
export function calculateEnergyRecoveryOverTime(
  currentEnergy: number,
  maxEnergy: number,
  maxRecoveryRate: number,
  deltaTimeSeconds: number,
  integrationSteps: number = 16,
): number {
  // If already at max energy, no recovery needed
  if (currentEnergy >= maxEnergy) {
    return 0;
  }

  // For very small time steps, use simple calculation to avoid numerical issues
  if (deltaTimeSeconds < 0.001) {
    const recoveryRate = calculateRecoveryRate(currentEnergy, maxEnergy, maxRecoveryRate);
    const energyRecovered = recoveryRate * deltaTimeSeconds;
    return Math.min(energyRecovered, maxEnergy - currentEnergy);
  }

  // Use numerical integration with specified number of steps for accuracy
  const timeSteps = integrationSteps; // Use exactly the specified number of steps
  const timeStep = deltaTimeSeconds / timeSteps;

  let energy = currentEnergy;
  let totalRecovered = 0;

  for (let i = 0; i < timeSteps && energy < maxEnergy; i++) {
    const recoveryRate = calculateRecoveryRate(energy, maxEnergy, maxRecoveryRate);
    const stepRecovery = recoveryRate * timeStep;
    const actualRecovery = Math.min(stepRecovery, maxEnergy - energy);

    energy += actualRecovery;
    totalRecovered += actualRecovery;
  }

  return totalRecovered;
}

function energyToPosition(energy: number, maxEnergy: number): NormalizedValueBetweenZeroAndOne {
  return maxEnergy > 0 ? Math.min(1, energy / maxEnergy) : 1;
}

function positionToEnergy(position: NormalizedValueBetweenZeroAndOne, maxEnergy: number): number {
  return position * maxEnergy;
}

export function refreshCapacitorEnergy(
  actor: Actor,
  position = getPosition(actor),
  maxEnergy = getMaxEnergy(actor),
): void {
  setEnergy(actor, positionToEnergy(position, maxEnergy));
}

/**
 * @deprecated - Use the pure functions directly
 */
export type ActorCapacitorApi = {
  getCurrentEnergy: typeof getCurrentEnergy;
  getMaxEnergy: typeof getMaxEnergy;
  getPosition: typeof getPosition;
  setPosition: typeof setPosition;
  setEnergy: typeof setEnergy;
  getCurrentRecoveryRate: typeof getCurrentRecoveryRate;
  getMaxRecoveryRate: typeof getMaxRecoveryRate;
  consumeEnergy: typeof consumeEnergy;
  computeRecoveryEnergy: typeof computeRecoveryEnergy;
  recoverEnergy: typeof recoverEnergy;
  canAfford: typeof canAfford;
  getEnergyPercentage: typeof getEnergyPercentage;
  refreshCapacitorEnergy: typeof refreshCapacitorEnergy;
};

export const DEFAULT_CAPACITOR_API_WITH_RECOVERY: Readonly<ActorCapacitorApi> = {
  getCurrentEnergy,
  getMaxEnergy,
  getPosition,
  setPosition,
  setEnergy,
  getCurrentRecoveryRate,
  getMaxRecoveryRate,
  consumeEnergy,
  computeRecoveryEnergy,
  recoverEnergy,
  canAfford,
  getEnergyPercentage,
  refreshCapacitorEnergy,
};

/**
 * Create a new actor capacitor API
 * @deprecated - Use the pure functions directly
 */
export function createActorCapacitorApi(): ActorCapacitorApi {
  return DEFAULT_CAPACITOR_API_WITH_RECOVERY;
}
