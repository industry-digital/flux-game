// Physics constants now defined locally to avoid confusion with mathematical constants

import { GOLDEN_RATIO } from '~/types/world/constants';

/**
 * Every point of GRA increases an actor's top speed *ceiling* by this much.
 */
export const MAX_VELOCITY_PER_GRACE_POINT = 0.25; // meters per second

/**
 * Every point of GRA reduces the actor's effective mass for movement-based calculations.
 * Starting with 0% at baseline `10 GRA`, and linearly approaching `61.8`% as `GRA` approaches 100.
 */
export const MAX_INERTIA_REDUCTION = 1 / GOLDEN_RATIO; // 61.8% (Golden Ratio conjugate)

export const POWER_PER_POW_POINT = 10; // Watts

/**
 * Strike duration for kinetic energy calculations (seconds)
 * This is the period over which an actor applies power to the part of the body that strikes the target.
 */
export const DEFAULT_STRIKE_DURATION = 0.2; // 200ms

/**
 * Energy transfer efficiency for muscular strikes
 */
export const STRIKE_EFFICIENCY = 1 / GOLDEN_RATIO; // 61.8% (Golden Ratio conjugate)

/**
 * Damage conversion: 1 damage point = 10 joules of kinetic energy
 */
export const JOULES_PER_DAMAGE = 10;

const BASELINE_POWER_OUTPUT = 50; // 50W baseline bonus

const BASELINE_TOP_SPEED = 2; // 2 m/s baseline

// Calculate effective mass based on Grace (reduces inertia)
export function calculateEffectiveMass(grace: number, naturalMass: number): number {
    const inertiaReduction = calculateInertiaReduction(grace);
    return naturalMass * (1 - inertiaReduction);
}

// Calculate top speed based on Grace stat
export function calculateTopSpeed(
  grace: number,
  scalingFactor: number = MAX_VELOCITY_PER_GRACE_POINT,
  baseline: number = BASELINE_TOP_SPEED,
): number {
    // Linear scaling: Grace determines top speed via configurable multiplier
    // Minimum base speed of 5 m/s even at Grace 0
    return baseline + Math.max(grace * scalingFactor, 5);
}

// Calculate power output based on Power statu
export function calculatePowerOutput(
  power: number,
  scalingFactor: number = POWER_PER_POW_POINT,
  baseline: number = BASELINE_POWER_OUTPUT,
): number {
    return baseline + (power * scalingFactor);
}

const NORMAL_STAT_RANGE = 90; // GRA 10 to 100
const INERTIAL_REDUCTION_PER_STAT_POINT = MAX_INERTIA_REDUCTION / NORMAL_STAT_RANGE; // 61.8% / 90 = 0.6867% per point

// Calculate inertia reduction percentage from Grace stat
export function calculateInertiaReduction(grace: number): number {
    // Linear scaling: GRA 10 = 0%, GRA 100 = 61.8%
    // Formula: (grace - 10) × (61.8% / 90)
    if (grace <= 10) return 0;
    const graceAboveBaseline = grace - 10;
    return Math.min(graceAboveBaseline * INERTIAL_REDUCTION_PER_STAT_POINT, MAX_INERTIA_REDUCTION);
}

// Calculate gap-closing motion profile
export function calculateGapClosing(power: number, grace: number, distance: number, naturalMass: number) {
    const powerOutput = calculatePowerOutput(power);
    const effectiveMass = calculateEffectiveMass(grace, naturalMass);
    const topSpeed = calculateTopSpeed(grace);

    // Calculate acceleration from power and mass
    const acceleration = powerOutput / effectiveMass;

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
    const dt = totalTime / 100; // 100 points

    for (let i = 0; i <= 100; i++) {
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
export function calculateMuscularKineticEnergy(power: number): number {
    const powerOutput = calculatePowerOutput(power);
    return powerOutput * DEFAULT_STRIKE_DURATION * STRIKE_EFFICIENCY;
}

// Calculate momentum kinetic energy from movement
export function calculateMomentumKineticEnergy(velocity: number, mass: number): number {
    return 0.5 * mass * velocity * velocity;
}

// Calculate weapon kinetic energy bonus
export function calculateWeaponKineticEnergy(weaponType: 'bare' | 'dagger' | 'sword' | 'warhammer'): number {
    const weaponKE = {
        bare: 0,
        dagger: 50,
        sword: 150,
        warhammer: 250
    };
    return weaponKE[weaponType];
}

// Calculate total damage from all kinetic energy sources
export function calculateTotalDamage(
    power: number,
    velocity: number,
    mass: number,
    weaponType: 'bare' | 'dagger' | 'sword' | 'warhammer' = 'bare'
): number {
    const muscularKE = calculateMuscularKineticEnergy(power);
    const momentumKE = calculateMomentumKineticEnergy(velocity, mass);
    const weaponKE = calculateWeaponKineticEnergy(weaponType);

    const totalKE = muscularKE + momentumKE + weaponKE;
    return totalKE / JOULES_PER_DAMAGE;
}

// Enhanced gap-closing with damage calculation
export function calculateGapClosingWithDamage(
    power: number,
    grace: number,
    distance: number,
    naturalMass: number,
    weaponType: 'bare' | 'dagger' | 'sword' | 'warhammer' = 'bare'
) {
    const motionProfile = calculateGapClosing(power, grace, distance, naturalMass);
    const impactDamage = calculateTotalDamage(power, motionProfile.maxVelocity, naturalMass, weaponType);

    return {
        ...motionProfile,
        impactDamage,
        muscularKE: calculateMuscularKineticEnergy(power),
        momentumKE: calculateMomentumKineticEnergy(motionProfile.maxVelocity, naturalMass),
        weaponKE: calculateWeaponKineticEnergy(weaponType),
        totalKE: calculateMuscularKineticEnergy(power) +
                calculateMomentumKineticEnergy(motionProfile.maxVelocity, naturalMass) +
                calculateWeaponKineticEnergy(weaponType)
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
    const powerOutput = calculatePowerOutput(power);
    return powerOutput / mass;
}

// Utility: Compare build effectiveness for gap-closing
export function compareBuildEffectiveness(
    build1: { power: number; grace: number; mass: number },
    build2: { power: number; grace: number; mass: number },
    distance: number = 100,
    weaponType: 'bare' | 'dagger' | 'sword' | 'warhammer' = 'bare'
) {
    const result1 = calculateGapClosingWithDamage(build1.power, build1.grace, distance, build1.mass, weaponType);
    const result2 = calculateGapClosingWithDamage(build2.power, build2.grace, distance, build2.mass, weaponType);

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
