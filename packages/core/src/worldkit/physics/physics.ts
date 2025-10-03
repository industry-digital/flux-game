/**
 * - POW determines top speed only
 * - FIN determines acceleration only (via mass reduction)
 * - Creates clear short-distance vs long-distance trade-offs
 *
 * Actor capability modeling reference points:
 *   - A baseline shell has the physical capabilities of an ordinary adult human male, about 70kg
 *   - An elite shell has the capabilities of a being like Motoko Kusanagi, of Ghost in the Shell
 *      (superhuman speed, strength, reflexes, etc.)
 */

import { GOLDEN_RATIO } from '~/types/world/constants';
import { BASELINE_STAT_VALUE, NORMAL_STAT_RANGE } from '~/worldkit/entity/stats';

/**
 * Top speed scaling - purely POW based
 * Baseline (10 POW): 5 m/s (normal human jogging)
 * Elite (100 POW): 25 m/s (superhuman sprint)
 */
const BASELINE_TOP_SPEED = 5; // m/s
const MAX_TOP_SPEED = 25; // m/s
const TOP_SPEED_PER_POW = (MAX_TOP_SPEED - BASELINE_TOP_SPEED) / NORMAL_STAT_RANGE;

/**
 * Acceleration scaling - purely FIN based via effective mass reduction
 * FIN reduces effective mass for acceleration calculations only
 * At impact, full mass is used for momentum transfer
 */
const BASELINE_MASS = 70; // kg (standard adult male)
const MAX_MASS_REDUCTION = 1 / GOLDEN_RATIO; // 61.8% max reduction

/**
 * Exported constants for test compatibility
 */
export const MAX_INERTIA_REDUCTION = MAX_MASS_REDUCTION; // 61.8% max reduction

/**
 * Power output for acceleration calculations now uses peakPowerOutput
 * This unifies the power system - acceleration and muscular damage both use the same power source
 */

/**
 * Damage conversion: Joules per point of damage
 */
const JOULES_PER_DAMAGE = 5;

/**
 * Strike duration for kinetic energy calculations (seconds)
 * This is the period over which an actor applies power to the part of the body that strikes the target.
 */
export const DEFAULT_STRIKE_DURATION = 0.25; // 250ms

/**
 * Energy transfer efficiency for muscular strikes
 */
export const STRIKE_EFFICIENCY = 1;

/**
 * Export JOULES_PER_DAMAGE for test compatibility
 */
export { JOULES_PER_DAMAGE };

/**
 * Power output constants for calculatePeakPowerOutput
 */
const BASELINE_POWER_OUTPUT = 125; // 125W baseline
const POWER_PER_POW_POINT = 25; // 25W per POW point

/**
 * Calculate peak power output based on Power stat
 * Formula: 125W baseline + (power * 25W per point)
 */
export function calculatePeakPowerOutput(power: number): number {
  return BASELINE_POWER_OUTPUT + (power * POWER_PER_POW_POINT);
}

/**
 * Calculate inertia reduction percentage from finesse stat
 * Linear scaling: FIN 10 = 0%, FIN 100 = 61.8%
 */
export function calculateInertiaReduction(finesse: number): number {
  if (finesse <= BASELINE_STAT_VALUE) return 0;
  const finesseAboveBaseline = finesse - BASELINE_STAT_VALUE;
  const inertiaReduction = (finesseAboveBaseline / NORMAL_STAT_RANGE) * MAX_INERTIA_REDUCTION;
  return Math.min(inertiaReduction, MAX_INERTIA_REDUCTION);
}

/**
 * Calculate inertial mass for acceleration based purely on FIN
 * Returns reduced mass for acceleration calculations only
 */
export function calculateInertialMass(finesse: number, actualMass: number = BASELINE_MASS): number {
  const massReductionFactor = calculateInertiaReduction(finesse);
  return actualMass * (1 - massReductionFactor);
}

/**
 * Calculate an actor's top speed based purely on POW
 */
export function calculateTopSpeed(powStat: number): number {
  return BASELINE_TOP_SPEED + (powStat - BASELINE_STAT_VALUE) * TOP_SPEED_PER_POW;
}

/**
 * Calculate distance traveled over time with pure POW/FIN split
 * Creates natural crossover point between acceleration and top speed phases
 */
export function calculateMovementDistance(
  powStat: number,
  finStat: number,
  timeSeconds: number,
  actualMass: number = BASELINE_MASS
): { distance: number; finalVelocity: number; timeToTopSpeed: number } {

  const topSpeed = calculateTopSpeed(powStat);
  const acceleration = calculateNonRealisticAcceleration(powStat, finStat, actualMass);
  const timeToTopSpeed = topSpeed / acceleration;

  let distance: number;
  let finalVelocity: number;

  if (timeSeconds <= timeToTopSpeed) {
    // Pure acceleration phase: d = ½at²
    distance = 0.5 * acceleration * timeSeconds * timeSeconds;
    finalVelocity = acceleration * timeSeconds;
  } else {
    // Acceleration + constant velocity phase
    const accelerationDistance = 0.5 * acceleration * timeToTopSpeed * timeToTopSpeed;
    const constantVelocityTime = timeSeconds - timeToTopSpeed;
    const constantVelocityDistance = topSpeed * constantVelocityTime;

    distance = accelerationDistance + constantVelocityDistance;
    finalVelocity = topSpeed;
  }

  return {
    distance,
    finalVelocity,
    timeToTopSpeed
  };
}

/**
 * Calculate acceleration capability based on POW and FIN
 * POW provides "force", FIN reduces effective mass
 * Returns a number that should be interpreted as acceleration in m/s^2, even
 * though the actual units are m^2/s^3 (specific power)
 */
export function calculateNonRealisticAcceleration(powStat: number, finStat: number, actualMass: number = BASELINE_MASS): number {
  const peakPowerOutput = calculatePeakPowerOutput(powStat);
  const effectiveMass = calculateInertialMass(finStat, actualMass);
  const specificPower = peakPowerOutput / effectiveMass; // m^2/s^3

  // This is where we depart from realistic physics
  // In this combat system, acceleration is a function of an actor's peak power output and effective mass
  return specificPower;
}

// Calculate gap-closing motion profile
export function calculateGapClosing(
  power: number,
  finesse: number,
  distance: number,
  naturalMass: number,
  steps: number = 128,
) {
    const powerOutput = calculatePeakPowerOutput(power); // Watts
    const effectiveMass = calculateInertialMass(finesse, naturalMass); // Finesse reduces inertia
    const topSpeed = calculateTopSpeed(power); // POW determines top speed

    // Calculate total force using F = ma physics: F = 67% FIN + 33% POW
    // Counterintuitive, since in the physical world, POW would directly contribute to acceleration
    // However, for the sake of gameplay, we are trying to simulate a mechanic whereby a high-Finesse
    // actor accelerates really quickly over a short distance. Reasoning: less mass -> less inertia -> more acceleration
    // FIN contributes through technique/agility, POW through raw strength
    const finesseForce = (finesse / 10) * 100; // Newtons from "technique"
    const powerForce = powerOutput / 10; // Newtons from "power contribution"
    const totalForce = (finesseForce * 0.67) + (powerForce * 0.33);

    // Apply F = ma to get acceleration
    const acceleration = totalForce / effectiveMass;

    // Calculate velocity if we accelerated the full distance (uncapped)
    const uncappedFinalVelocity = Math.sqrt(2 * acceleration * distance);

    let accelTime, accelDistance, cruiseTime, cruiseDistance, finalVelocity, totalTime;

    if (uncappedFinalVelocity <= topSpeed) {
        // We never hit the speed limit - pure acceleration
        finalVelocity = uncappedFinalVelocity;
        accelTime = finalVelocity / acceleration;
        accelDistance = distance;
        cruiseTime = 0;
        cruiseDistance = 0;
        totalTime = accelTime;
    } else {
        // We hit the speed limit - accelerate to top speed, then cruise
        finalVelocity = topSpeed;

        // Time and distance to reach top speed
        accelTime = topSpeed / acceleration;
        accelDistance = 0.5 * acceleration * accelTime * accelTime;

        // Remaining distance at constant top speed
        cruiseDistance = distance - accelDistance;
        cruiseTime = cruiseDistance / topSpeed;

        totalTime = accelTime + cruiseTime;
    }

    const decelTime = 0;
    const decelDistance = 0;

    // Total time is just acceleration time

    // Generate motion profile points
    const timePoints = [];
    const velocityPoints = [];
    const positionPoints = [];
    const dt = totalTime / steps; // 100 points

    for (let i = 0; i <= steps; i++) {
        const t = i * dt;
        let velocity, position;

        if (t <= accelTime) {
            // Acceleration phase
            velocity = acceleration * t;
            position = 0.5 * acceleration * t * t;
        } else {
            // Cruise phase at top speed
            const cruiseT = t - accelTime;
            velocity = topSpeed;
            position = accelDistance + topSpeed * cruiseT;
        }

        timePoints.push(t);
        velocityPoints.push(Math.max(0, velocity));
        positionPoints.push(Math.min(distance, Math.max(0, position)));
    }

    return {
        totalTime,
        maxVelocity: finalVelocity,
        acceleration,
        deceleration: 0,
        accelTime,
        cruiseTime,
        decelTime,
        accelDistance,
        cruiseDistance,
        decelDistance,
        timePoints,
        velocityPoints,
        positionPoints,
        averageSpeed: distance / totalTime
    };
}

// Calculate muscular kinetic energy from Power stat
export function calculateMuscularKineticEnergy(power: number, duration: number = DEFAULT_STRIKE_DURATION): number {
    const powerOutput = calculatePeakPowerOutput(power);
    return powerOutput * duration; // Linear duration scaling
}
// Calculate momentum kinetic energy from movement
export function calculateMomentumKineticEnergy(velocity: number, mass: number): number {
    return 0.5 * mass * velocity * velocity;
}

// Calculate weapon efficiency multiplier (Golden Ratio progression)
export function calculateWeaponEfficiency(weaponType: 'bare' | 'dagger' | 'sword' | 'warhammer'): number {
    const weaponEfficiencies = {
        bare: 1 / (GOLDEN_RATIO * GOLDEN_RATIO), // φ⁻² = 0.382 (unarmed)
        dagger: 1 / GOLDEN_RATIO,                // φ⁻¹ = 0.618 (light)
        sword: 1.0,                              // 1.0 = baseline (medium)
        warhammer: GOLDEN_RATIO                  // φ = 1.618 (heavy)
    };
    return weaponEfficiencies[weaponType];
}

// Calculate POW-based momentum transfer efficiency
export function calculateMomentumTransferEfficiency(power: number): number {
    // POW directly determines efficiency percentage
    return Math.min(power / 100, 1.0); // Cap at 100% efficiency
}

// Calculate total damage using new physics formula
export function calculateTotalDamage(
    power: number,
    velocity: number,
    mass: number,
    weaponType: 'bare' | 'dagger' | 'sword' | 'warhammer' = 'bare'
): number {
    // Generate kinetic energy components
    const muscularKE = calculateMuscularKineticEnergy(power);
    const rawMomentumKE = calculateMomentumKineticEnergy(velocity, mass);

    // Apply POW-based momentum transfer efficiency
    const momentumEfficiency = calculateMomentumTransferEfficiency(power);
    const effectiveMomentumKE = rawMomentumKE * momentumEfficiency;

    // Apply weapon efficiency to total kinetic energy
    const weaponEfficiency = calculateWeaponEfficiency(weaponType);
    const totalEffectiveKE = (muscularKE + effectiveMomentumKE) * weaponEfficiency;

    return totalEffectiveKE / JOULES_PER_DAMAGE;
}

// Enhanced gap-closing with damage calculation
export function calculateGapClosingWithDamage(
    power: number,
    finesse: number,
    distance: number,
    naturalMass: number,
    weaponType: 'bare' | 'dagger' | 'sword' | 'warhammer' = 'bare'
) {
    const motionProfile = calculateGapClosing(power, finesse, distance, naturalMass);
    const impactDamage = calculateTotalDamage(power, motionProfile.maxVelocity, naturalMass, weaponType);

    // Calculate component energies for analysis
    const muscularKE = calculateMuscularKineticEnergy(power);
    const rawMomentumKE = calculateMomentumKineticEnergy(motionProfile.maxVelocity, naturalMass);
    const momentumEfficiency = calculateMomentumTransferEfficiency(power);
    const effectiveMomentumKE = rawMomentumKE * momentumEfficiency;
    const weaponEfficiency = calculateWeaponEfficiency(weaponType);
    const totalEffectiveKE = (muscularKE + effectiveMomentumKE) * weaponEfficiency;

    return {
        ...motionProfile,
        impactDamage,
        muscularKE,
        momentumKE: effectiveMomentumKE, // Return effective momentum after efficiency
        weaponEfficiency, // Return efficiency multiplier instead of flat bonus
        totalKE: totalEffectiveKE
    };
}

// Utility: Convert damage back to kinetic energy
export function damageToKineticEnergy(damage: number): number {
    return damage * JOULES_PER_DAMAGE;
}

// Utility: Convert kinetic energy to damage
export function kineticEnergyToDamage(kineticEnergy: number): number {
    return kineticEnergy / JOULES_PER_DAMAGE;
}

// Utility: Calculate velocity needed for specific momentum damage
export function velocityForMomentumDamage(targetDamage: number, mass: number): number {
    const targetKE = damageToKineticEnergy(targetDamage);
    return Math.sqrt(2 * targetKE / mass);
}

// Utility: Calculate mass needed for specific momentum damage at given velocity
export function massForMomentumDamage(targetDamage: number, velocity: number): number {
    const targetKE = damageToKineticEnergy(targetDamage);
    return 2 * targetKE / (velocity * velocity);
}

// Utility: Get power-to-weight ratio
export function powerToWeightRatio(power: number, mass: number): number {
    const powerOutput = calculatePeakPowerOutput(power);
    return powerOutput / mass;
}

// Utility: Compare build effectiveness for gap-closing
export function compareBuildEffectiveness(
    build1: { power: number; finesse: number; mass: number },
    build2: { power: number; finesse: number; mass: number },
    distance: number = 100,
    weaponType: 'bare' | 'dagger' | 'sword' | 'warhammer' = 'bare'
) {
    const result1 = calculateGapClosingWithDamage(build1.power, build1.finesse, distance, build1.mass, weaponType);
    const result2 = calculateGapClosingWithDamage(build2.power, build2.finesse, distance, build2.mass, weaponType);

    return {
        build1: {
            time: result1.totalTime,
            damage: result1.impactDamage,
            maxVelocity: result1.maxVelocity,
            powerToWeight: powerToWeightRatio(build1.power, build1.mass)
        },
        build2: {
            time: result2.totalTime,
            damage: result2.impactDamage,
            maxVelocity: result2.maxVelocity,
            powerToWeight: powerToWeightRatio(build2.power, build2.mass)
        },
        winner: {
            fasterGapClose: result1.totalTime < result2.totalTime ? 'build1' : 'build2',
            higherDamage: result1.impactDamage > result2.impactDamage ? 'build1' : 'build2',
            higherSpeed: result1.maxVelocity > result2.maxVelocity ? 'build1' : 'build2'
        }
    };
}
