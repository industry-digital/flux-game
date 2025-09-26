/**
 * Linear Scaling Weapon Damage System
 *
 * Clean, predictable linear scaling to create tension between POW and FIN builds
 * across different weapon masses without complex curve interactions.
 */

import { DEFAULT_ATTACK_AP_COST } from '~/worldkit/combat/attack';

/**
 * Tunable coefficients for linear scaling system
 */
const DAMAGE_COEFFICIENTS = {
  baseDamage: 20,           // Base damage for all weapons
  powDamagePerKg: 20,       // Damage bonus per kg per 100 POW (increased from 15)
};

const AP_COST_COEFFICIENTS = {
  baseApCost: DEFAULT_ATTACK_AP_COST,          // Base AP for a STRIKE action
  massApPenalty: 0.15,      // AP penalty per kg of weapon mass (increased from 0.1)
  finApReduction: 1.8,      // AP reduction coefficient for FIN (reduced from 2.5)
  minApCost: 0.2,           // Minimum AP cost (reduced from 0.3 to 0.2)
};

/**
 * Calculate weapon damage using linear POW scaling
 * Heavy weapons get more benefit from POW investment
 */
export function calculateWeaponDamage(weaponMassKg: number, powStat: number): number {
  // Guard against unit mismatch: weapon mass should be in kilograms, not grams
  if (weaponMassKg > 100) {
    throw new Error(
      `Invalid weapon mass: ${weaponMassKg}kg. ` +
      `This likely indicates a units error - weapon schemas store mass in grams, ` +
      `but this function expects kilograms. Convert with: mass / 1000`
    );
  }

  const baseDamage = DAMAGE_COEFFICIENTS.baseDamage;
  const powDamageBonus = (powStat / 100) * weaponMassKg * DAMAGE_COEFFICIENTS.powDamagePerKg;

  return baseDamage + powDamageBonus;
}

/**
 * Calculate weapon AP cost using linear FIN scaling
 * Light weapons get more benefit from FIN investment
 */
export function calculateWeaponApCost(weaponMassKg: number, finStat: number): number {
  // Guard against unit mismatch: weapon mass should be in kilograms, not grams
  if (weaponMassKg > 100) {
    throw new Error(
      `Invalid weapon mass: ${weaponMassKg}kg. ` +
      `This likely indicates a units error - weapon schemas store mass in grams, ` +
      `but this function expects kilograms. Convert with: mass / 1000`
    );
  }

  const baseApCost = AP_COST_COEFFICIENTS.baseApCost + (weaponMassKg * AP_COST_COEFFICIENTS.massApPenalty);
  const finApReduction = (finStat / 100) * (AP_COST_COEFFICIENTS.finApReduction / weaponMassKg);

  const totalApCost = baseApCost - finApReduction;

  return Math.max(AP_COST_COEFFICIENTS.minApCost, totalApCost);
}

/**
 * Calculate turn-based DPS (Damage Per 6-Second Turn)
 * Shows average damage output over a standard combat turn
 */
export function calculateWeaponDps(weaponMassKg: number, powStat: number, finStat: number, durationSeconds: number = 6): number {
  const damage = calculateWeaponDamage(weaponMassKg, powStat);
  const apCost = calculateWeaponApCost(weaponMassKg, finStat);

  // Convert to damage per second for comparison
  return damage / apCost;
}

/**
 * Find optimal weapon mass for given stats
 * Returns the weapon mass that maximizes DPS
 */
export function findOptimalWeaponMass(
  powStat: number,
  finStat: number,
  minMassKg: number = 0.5,
  maxMassKg: number = 15.0,
  stepSize: number = 0.1
): { optimalMass: number; maxDps: number } {
  let bestDps = 0;
  let optimalMass = minMassKg;

  for (let mass = minMassKg; mass <= maxMassKg; mass += stepSize) {
    const dps = calculateWeaponDps(mass, powStat, finStat);
    if (dps > bestDps) {
      bestDps = dps;
      optimalMass = mass;
    }
  }

  return { optimalMass, maxDps: bestDps };
}

/**
 * Complete weapon analysis for given mass and stats
 */
export function analyzeWeapon(weaponMassKg: number, powStat: number, finStat: number): {
  damage: number;
  apCost: number;
  dps: number;
  massCategory: string;
} {
  const damage = calculateWeaponDamage(weaponMassKg, powStat);
  const apCost = calculateWeaponApCost(weaponMassKg, finStat);
  const dps = damage / apCost;

  let massCategory: string;
  if (weaponMassKg < 1.0) massCategory = 'Ultra-Light';
  else if (weaponMassKg < 3.0) massCategory = 'Light';
  else if (weaponMassKg < 7.0) massCategory = 'Medium';
  else massCategory = 'Heavy';

  return { damage, apCost, dps, massCategory };
}
