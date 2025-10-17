import { DamageType } from '~/types/damage';
import { WeaponSchema } from '~/types/schema/weapon';
import { AmmoSchema } from '~/types/schema/ammo';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';

/**
 * Resolves the damage types for a weapon, considering ammunition for ranged weapons
 */
export function getWeaponDamageTypes(
  weapon: WeaponSchema,
  ammo?: AmmoSchema
): Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>> {
  // For ranged weapons with ammo, use the ammo's damage types
  if (weapon.ammo && ammo) {
    return ammo.damageTypes;
  }

  // For melee weapons or ranged weapons without ammo, use the weapon's damage types
  return weapon.damageTypes || {};
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
