import { DamageType } from '~/types/damage';
import { WeaponSchema } from '~/types/schema/weapon';
import { AmmoSchema } from '~/types/schema/ammo';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { RollSpecification } from '~/types/dice';

export const NO_DAMAGE_TYPES: Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>> = Object.freeze({});

/**
 * Resolves the damage types for a weapon, considering ammunition for ranged weapons
 */
export function getWeaponDamageTypes(
  weapon: WeaponSchema,
  ammo?: AmmoSchema
): Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>> {
  // If weapon uses ammo and ammo is provided, use the ammo's damage types
  if ('ammo' in weapon && weapon.ammo && ammo) {
    return ammo.damage.types;
  }

  if (!weapon.damage || !('types' in weapon.damage)) {
    throw new Error(`Could not resolve damage types for weapon: ${weapon.urn}`);
  }

  return weapon.damage.types;
}

/**
 * Gets the primary damage type for a weapon (the one with the highest value)
 */
export function getPrimaryDamageType(
  weapon: WeaponSchema,
  ammo?: AmmoSchema
): DamageType | null {
  const damageTypes = getWeaponDamageTypes(weapon, ammo);

  let primaryType: DamageType | null = null;
  let highestValue = 0;

  for (const damageType in damageTypes) {
    const value = damageTypes[damageType as DamageType]!;
    if (value === 1) {
      return damageType as DamageType;
    }
    if (value > highestValue) {
      highestValue = value;
      primaryType = damageType as DamageType;
    }
  }

  return primaryType;
}

/**
 * Resolves the base damage for a weapon, considering ammunition for ranged weapons
 */
export function getWeaponBaseDamage(
  weapon: WeaponSchema,
  ammo?: AmmoSchema
): RollSpecification {
  // If weapon uses ammo and ammo is provided, use the ammo's base damage
  if ('ammo' in weapon && weapon.ammo && ammo) {
    return ammo.damage.base;
  }

  if (!weapon.damage.base) {
    throw new Error(`Could not resolve base damage for weapon: ${weapon.urn}`);
  }

  return weapon.damage.base;
}
