/**
 * Tactical Action Cost Factory
 *
 * Generates ActionCost objects with tactical rounding applied upfront.
 * This centralizes the tactical rounding logic and ensures consistent
 * cost calculation across all combat actions.
 */

import { FullyQualifiedActionCost } from '~/types/combat';
import { roundApCostUp } from '~/worldkit/combat/tactical-rounding';
import { calculateWeaponApCost } from '~/worldkit/combat/ap';
import { distanceToAp } from '~/worldkit/physics/movement';
import { calculateMovementEnergyCost } from '~/worldkit/combat/energy-costs';
import { cleanApPrecision } from '~/worldkit/combat/ap';
import { WeaponSchema, WeaponTimer } from '~/types/schema/weapon';
import { Actor } from '~/types/entity/actor';

/**
 * Create tactical cost for weapon strike
 */
export function createStrikeCost(
  actor: Actor,
  weapon: WeaponSchema,
  timer: WeaponTimer
): FullyQualifiedActionCost {
  const preciseApCost = calculateWeaponApCost(actor, weapon, timer);
  return {
    ap: roundApCostUp(preciseApCost),
    energy: 0, // Strikes don't cost energy in current system
  };
}

/**
 * Create tactical cost for movement (distance-based)
 */
export function createMovementCostFromDistance(
  power: number,
  finesse: number,
  distance: number,
  massKg: number
): FullyQualifiedActionCost {
  const preciseApCost = distanceToAp(power, finesse, distance, massKg);
  const energyCost = calculateMovementEnergyCost(power, finesse, distance, massKg);

  return {
    ap: roundApCostUp(preciseApCost),
    energy: energyCost, // Energy doesn't use tactical rounding
  };
}

/**
 * Create tactical cost for movement (AP-based)
 */
export function createMovementCostFromAp(
  ap: number,
  power: number,
  finesse: number,
  massKg: number
): FullyQualifiedActionCost {
  // AP is already specified, so round it tactically
  const tacticalAp = roundApCostUp(ap);

  // Estimate distance for energy calculation
  // This is approximate since we're working backwards from AP
  const estimatedDistance = tacticalAp * 3; // Rough approximation
  const energyCost = calculateMovementEnergyCost(power, finesse, estimatedDistance, massKg);

  return {
    ap: tacticalAp,
    energy: energyCost,
  };
}


/**
 * Create zero-cost action (for TARGET, DONE, etc.)
 */
export function createZeroCost(): FullyQualifiedActionCost {
  return { ap: 0, energy: 0 };
}


/**
 * Create tactical cost for defend action (uses all remaining AP)
 *
 * Applies precision cleanup to eliminate floating-point artifacts
 * that can accumulate from previous AP deductions.
 */
export function createDefendCost(remainingAp: number): FullyQualifiedActionCost {
  return {
    ap: cleanApPrecision(remainingAp), // Clean up precision artifacts without changing intended value
    energy: 0,
  };
}

/**
 * Create tactical cost for max movement (uses all remaining AP)
 * Similar to defend, but includes energy cost for movement
 */
export function createMaxMovementCost(
  remainingAp: number,
  power: number,
  finesse: number,
  distance: number,
  massKg: number
): FullyQualifiedActionCost {
  const energyCost = calculateMovementEnergyCost(power, finesse, distance, massKg);

  return {
    ap: cleanApPrecision(remainingAp), // Use all available AP without rounding up
    energy: energyCost,
  };
}

/**
 * Calculate CLEAVE cost - same AP as STRIKE but adds energy cost
 */
export function createCleaveCost(
  actor: Actor,
  weapon: WeaponSchema,
): FullyQualifiedActionCost {
  // Same AP cost as a regular strike
  const baseCost = createStrikeCost(actor, weapon, WeaponTimer.ATTACK);

  // Energy cost for special attack capability
  // Base energy cost that scales with weapon mass (heavier weapons = more stamina)
  const baseEnergyCost = 200; // Base energy for any cleave
  const weaponMassKg = weapon.baseMass / 1000; // Convert grams to kg
  const weaponMassEnergy = weaponMassKg * 100; // Additional energy per kg of weapon
  const totalEnergyCost = baseEnergyCost + weaponMassEnergy;

  return {
    ap: baseCost.ap!, // Same AP cost as STRIKE
    energy: Math.round(totalEnergyCost), // Energy cost for special ability
  };
}
