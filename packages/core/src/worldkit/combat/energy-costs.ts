/**
 * Energy cost calculations for combat actions
 *
 * This module provides physics-based energy cost calculations for all combat actions,
 * integrating with the existing capacitor system and movement physics.
 */

import { calculateMovementTime, CalculateMovementTimeOptions, DEFAULT_CALCULATE_MOVEMENT_TIME_OPTIONS } from '~/worldkit/physics/movement';
import { WeaponSchema } from '~/types/schema/weapon';
import { CommandType } from '~/types/intent';

// ============================================================================
// MOVEMENT ENERGY COSTS
// ============================================================================

/**
 * Calculate energy cost for basic movement using simplified physics
 * Pure kinetic energy with efficiency dial - no friction or air resistance
 */
export function calculateMovementEnergyCost(
  power: number,
  finesse: number,
  distance: number,
  mass: number,
  options: CalculateMovementTimeOptions = DEFAULT_CALCULATE_MOVEMENT_TIME_OPTIONS,
): number {
  // Use existing movement physics to get time and derive velocity
  const time = calculateMovementTime(power, finesse, distance, mass, options);
  const avgVelocity = distance / time;

  // Pure kinetic energy: E = ½mv²
  const kineticEnergy = 0.5 * mass * avgVelocity * avgVelocity;

  // Technique efficiency (finesse reduces energy waste)
  // Better technique = less energy waste
  const efficiency = Math.max(
    ENERGY_COSTS.MIN_TECHNIQUE_EFFICIENCY,
    Math.min(ENERGY_COSTS.MAX_TECHNIQUE_EFFICIENCY, finesse / 100)
  );

  // Final energy cost accounting for inefficiency
  return Math.round(kineticEnergy / efficiency);
}

/**
 * Calculate energy cost for DASH movement (accelerated with momentum building)
 */
export function calculateDashEnergyCost(
  power: number,
  finesse: number,
  distance: number,
  mass: number,
  options: CalculateMovementTimeOptions = {}
): number {
  // Base movement cost
  const baseEnergy = calculateMovementEnergyCost(power, finesse, distance, mass, options);

  // DASH is 50% faster than normal movement
  const normalTime = calculateMovementTime(power, finesse, distance, mass, options);
  const dashTime = normalTime * 0.67; // 33% time reduction = 50% speed increase
  const dashVelocity = distance / dashTime;
  const normalVelocity = distance / normalTime;

  // Energy scales with velocity² (kinetic energy law)
  const velocityRatio = dashVelocity / normalVelocity;
  const velocityMultiplier = velocityRatio * velocityRatio;

  // Additional energy for explosive acceleration (based on POW)
  const explosiveAccelerationCost = power * 3; // 3J per POW point

  // Momentum building cost (enables advanced maneuvers)
  const momentumBuildingCost = mass * dashVelocity * 0.05; // 5% of momentum as energy

  return Math.round((baseEnergy * velocityMultiplier) + explosiveAccelerationCost + momentumBuildingCost);
}

/**
 * Calculate energy cost for CHARGE attack (momentum-enhanced strike from DASH state)
 * CHARGE = STRIKE + momentum utilization, only available when DASHing
 */
export function calculateChargeEnergyCost(
  weaponMassKg: number,
  powStat: number,
  actorMass: number,
  dashVelocity: number
): number {
  // Base strike energy cost (muscular component)
  const muscularEnergy = calculateStrikeEnergyCost(weaponMassKg, powStat, 0); // No velocity bonus here

  // Momentum utilization cost - converting velocity into strike power
  // This is the energy needed to channel momentum into the weapon
  const momentumKineticEnergy = 0.5 * actorMass * dashVelocity * dashVelocity;
  const momentumUtilizationCost = momentumKineticEnergy * 0.3; // 30% of kinetic energy to channel momentum

  // Coordination cost - combining muscular power with momentum requires precise timing
  const coordinationCost = (powStat * 2) + (dashVelocity * actorMass * 0.05); // Based on POW and momentum

  // Weapon mass affects momentum transfer efficiency
  const momentumTransferEfficiency = Math.max(0.4, Math.min(1.0, weaponMassKg / 2.0)); // Heavier weapons transfer momentum better
  const transferPenalty = momentumUtilizationCost * (1 - momentumTransferEfficiency);

  return Math.round(muscularEnergy + momentumUtilizationCost + coordinationCost + transferPenalty);
}

// ============================================================================
// WEAPON STRIKE ENERGY COSTS
// ============================================================================

/**
 * Calculate energy cost for weapon strikes based on muscular power output
 */
export function calculateStrikeEnergyCost(
  weaponMassKg: number,
  powStat: number,
  currentVelocity: number = 0
): number {
  // Base muscular energy (from damage system calculations)
  const naturalPower = (powStat * 25) + 125; // Watts
  const strikeTime = 0.25; // 250ms strike duration
  const muscularEnergy = naturalPower * strikeTime; // Joules

  // Momentum component if actor is moving during strike
  const momentumEnergy = currentVelocity > 0
    ? 0.5 * weaponMassKg * currentVelocity * currentVelocity * 0.2 // 20% of weapon kinetic energy
    : 0;

  // Weapon mass scaling (heavier weapons require more energy to wield effectively)
  const massMultiplier = 1 + (weaponMassKg * 0.3); // 30% increase per kg

  // Technique efficiency based on weapon type
  const baseEfficiency = 0.8; // 80% base efficiency

  return Math.round((muscularEnergy + momentumEnergy) * massMultiplier / baseEfficiency);
}

/**
 * Calculate energy cost for weapon strikes with weapon schema
 */
export function calculateWeaponStrikeEnergyCost(
  weapon: WeaponSchema,
  powStat: number,
  currentVelocity: number = 0
): number {
  const weaponMassKg = weapon.baseMass / 1000; // Convert grams to kg
  return calculateStrikeEnergyCost(weaponMassKg, powStat, currentVelocity);
}

// ============================================================================
// ADVANCED MANEUVER ENERGY COSTS
// ============================================================================

/**
 * Calculate energy cost for SOMERSAULT (aerial repositioning maneuver)
 */
export function calculateSomersaultEnergyCost(
  mass: number,
  currentVelocity: number,
  distance: number
): number {
  // Base cost for gyroscopic stabilization and trajectory calculation
  const gyroscopicCost = 650; // Joules (from movement documentation)

  // Additional cost based on mass and velocity (physics of rotation)
  const rotationalEnergy = 0.5 * mass * currentVelocity * currentVelocity * 0.4; // 40% of linear kinetic energy

  // Distance scaling (longer aerial maneuvers cost more)
  const distanceMultiplier = 1 + (distance / 30); // Scales with distance over 30m baseline

  // Air resistance and control costs
  const controlCost = mass * 2; // 2J per kg for aerial control

  return Math.round((gyroscopicCost + rotationalEnergy + controlCost) * distanceMultiplier);
}

/**
 * Calculate energy cost for VAULT (momentum-assisted traversal)
 */
export function calculateVaultEnergyCost(
  mass: number,
  currentVelocity: number,
  vaultType: 'cover' | 'ally'
): number {
  // Base costs from movement documentation
  const baseCost = vaultType === 'cover' ? 400 : 550; // Joules

  // Velocity scaling (faster vaults require more precise control)
  const velocityBonus = currentVelocity * mass * 0.08; // 8% of momentum as energy cost

  // Mass scaling (heavier actors need more energy to vault)
  const massMultiplier = 1 + ((mass - 70) / 70) * 0.2; // 20% increase per 70kg above baseline

  return Math.round((baseCost + velocityBonus) * Math.max(0.5, massMultiplier));
}

// ============================================================================
// DEFENSIVE ACTION ENERGY COSTS
// ============================================================================

/**
 * Calculate energy cost for DEFEND action (active defense with AP investment)
 * DEFEND costs no energy - it's purely a tactical AP investment
 */
export function calculateDefendEnergyCost(
  apInvested: number,
  powStat: number,
  finStat: number
): number {
  // DEFEND costs no energy - it's a tactical stance that only consumes time (AP)
  // The defensive benefits come from dedicating time and attention, not energy expenditure
  return 0;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current actor velocity from combat state (for momentum-based calculations)
 */
export function getActorVelocity(
  previousPosition: number,
  currentPosition: number,
  timeElapsed: number
): number {
  if (timeElapsed <= 0) return 0;

  const distance = Math.abs(currentPosition - previousPosition);
  return distance / timeElapsed;
}

/**
 * Calculate total energy cost for a combat action with all components
 */
export function calculateTotalActionEnergyCost(
  commandType: CommandType,
  params: {
    // Movement params
    power?: number;
    finesse?: number;
    distance?: number;
    mass?: number;

    // Strike params
    weaponMassKg?: number;
    currentVelocity?: number;

    // Charge params (momentum-enhanced strike)
    dashVelocity?: number;

    // Defend params
    apInvested?: number;

    // Advanced maneuver params
    vaultType?: 'cover' | 'ally';

    // Options
    movementOptions?: CalculateMovementTimeOptions;
  }
): number {
  switch (commandType) {
    case CommandType.ADVANCE:
    case CommandType.RETREAT:
      if (!params.power || !params.finesse || !params.distance || !params.mass) {
        throw new Error('Movement requires power, finesse, distance, and mass parameters');
      }
      return calculateMovementEnergyCost(
        params.power,
        params.finesse,
        params.distance,
        params.mass,
        params.movementOptions
      );

    case CommandType.DASH:
      if (!params.power || !params.finesse || !params.distance || !params.mass) {
        throw new Error('Dash requires power, finesse, distance, and mass parameters');
      }
      return calculateDashEnergyCost(
        params.power,
        params.finesse,
        params.distance,
        params.mass,
        params.movementOptions
      );

    case CommandType.CHARGE:
      if (!params.weaponMassKg || !params.power || !params.mass || !params.dashVelocity) {
        throw new Error('Charge requires weaponMassKg, power, mass, and dashVelocity parameters');
      }
      return calculateChargeEnergyCost(
        params.weaponMassKg,
        params.power,
        params.mass,
        params.dashVelocity
      );

    case CommandType.STRIKE:
      if (!params.weaponMassKg || !params.power) {
        throw new Error('Strike requires weaponMassKg and power parameters');
      }
      return calculateStrikeEnergyCost(
        params.weaponMassKg,
        params.power,
        params.currentVelocity || 0
      );

    case CommandType.DEFEND:
      // DEFEND costs no energy - only AP
      return 0;

    case CommandType.SOMERSAULT:
      if (!params.mass || !params.distance) {
        throw new Error('Somersault requires mass and distance parameters');
      }
      return calculateSomersaultEnergyCost(
        params.mass,
        params.currentVelocity || 0,
        params.distance
      );

    case CommandType.VAULT:
      if (!params.mass || !params.vaultType) {
        throw new Error('Vault requires mass and vaultType parameters');
      }
      return calculateVaultEnergyCost(
        params.mass,
        params.currentVelocity || 0,
        params.vaultType
      );

    default:
      throw new Error(`Unknown action type: ${commandType}`);
  }
}

// ============================================================================
// ENERGY COST CONSTANTS
// ============================================================================

/**
 * Energy cost constants for quick reference
 */
export const ENERGY_COSTS = {
  // Base action costs
  BASE_STRIKE_COST: 50, // Minimum energy for any strike
  BASE_DEFEND_COST: 0, // DEFEND costs no energy - only AP

  // Multipliers
  DASH_VELOCITY_MULTIPLIER: 1.5, // 50% faster than normal movement
  CHARGE_VELOCITY_MULTIPLIER: 2.0, // 100% faster than normal movement

  // Advanced maneuver base costs
  SOMERSAULT_BASE_COST: 650, // Joules
  VAULT_COVER_BASE_COST: 400, // Joules
  VAULT_ALLY_BASE_COST: 550, // Joules

  // Efficiency factors
  MIN_TECHNIQUE_EFFICIENCY: 0.3, // 30% minimum efficiency
  MAX_TECHNIQUE_EFFICIENCY: 1.0, // 100% maximum efficiency
} as const;
export { calculateMovementTime };
