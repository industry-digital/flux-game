import { WeaponSchema } from '~/types/schema/weapon';

export enum RangeClassification {
  MELEE = 'melee',           // 0-1m, no falloff
  REACH = 'reach',           // 2m, no falloff (polearms, spears)
  RANGED = 'ranged',         // 2m+, with falloff
}

/**
 * Tactical usage recommendations based on weapon characteristics
 */
export enum WeaponTactic {
  CLOSE_COMBAT = 'close_combat',     // Get in close, stay mobile
  CONTROL_DISTANCE = 'control_distance', // Maintain optimal range
  KITE_ENEMY = 'kite_enemy',         // Stay at max range, retreat when approached
  AREA_DENIAL = 'area_denial',       // Control large areas
  AMBUSH = 'ambush',                 // Strike from concealment
}

/**
 * Classify weapon based on range characteristics
 */
export function classifyWeapon(weapon: WeaponSchema): RangeClassification {
  const { range } = weapon;

  // All ranged weapons have a falloff
  if (range.falloff) {
    return RangeClassification.RANGED;
  }

  // Reach weapons have a fixed range of 2m
  if (range.optimal === 2) {
    return RangeClassification.REACH;
  }

  // All other weapons are melee (1m range)
  return RangeClassification.MELEE;
}

/**
 * Recommend tactical usage based on weapon characteristics
 */
export function computeBestTacticForWeapon(weapon: WeaponSchema): WeaponTactic {
  const weaponClass = classifyWeapon(weapon);

  switch (weaponClass) {
    case RangeClassification.MELEE:
      return WeaponTactic.CLOSE_COMBAT;

    case RangeClassification.REACH:
      return WeaponTactic.CONTROL_DISTANCE;

    case RangeClassification.RANGED:
      return WeaponTactic.KITE_ENEMY;

    default:
      return WeaponTactic.CLOSE_COMBAT;
  }
}

export function isMeleeWeapon(weapon: WeaponSchema): boolean {
  return classifyWeapon(weapon) === RangeClassification.MELEE;
}

export function isReachWeapon(weapon: WeaponSchema): boolean {
  return classifyWeapon(weapon) === RangeClassification.REACH;
}

export function isRangedWeapon(weapon: WeaponSchema): boolean {
  const weaponClass = classifyWeapon(weapon);
  return weaponClass === RangeClassification.RANGED;
}

/**
 * Calculate the maximum effective range for any weapon type
 */
export function calculateMaxRange(weapon: WeaponSchema): number {
  const { range } = weapon;

  // If explicit max is set, use it
  if (!!range.max) {
    return range.max;
  }

  // For weapons with falloff, calculate effective range (optimal + 3 falloff lengths)
  if (range.falloff !== undefined) {
    return range.optimal + (3 * range.falloff);
  }

  // For weapons without falloff (melee/reach), use optimal range
  return range.optimal;
}

export function canWeaponHitFromDistance(weapon: WeaponSchema, distance: number): boolean {
  // Single classification call instead of up to 3
  const weaponClass = classifyWeapon(weapon);

  switch (weaponClass) {
    case RangeClassification.MELEE:
      return distance <= 1;

    case RangeClassification.REACH:
      return distance === 2;

    case RangeClassification.RANGED:
      const { range } = weapon;

      if (range.min && distance < range.min) {
        return false;
      }

      if (range.max) {
        return distance < range.max;
      }

      // Compute three falloff lengths if the weapon has a falloff
      if (range.falloff) {
        return distance <= range.optimal + (3 * range.falloff);
      }

      // Fallback: if max is undefined, assume max equals optimal range
      return distance <= range.optimal;

    default:
      throw new Error('Failed to classify weapon');
  }
}
