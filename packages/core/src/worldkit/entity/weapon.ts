import { AmmoSchema } from '~/types/schema/ammo';
import { WeaponSchema } from '~/types/schema/weapon';
import { AmmoSchemaURN, ItemURN, WeaponSchemaURN } from '~/types/taxonomy';

export const ALL_REMAINING_AMMO = -1 as const;
export type AmmoCount = typeof ALL_REMAINING_AMMO | number;

export type WeaponAmmoState = {
  type: AmmoSchemaURN;
  remaining: number;
};

export type WeaponEntity = {
  id: ItemURN;
  schema: WeaponSchemaURN;
  /**
   * For weapons that require ammo (ranged weapons), this tracks the currently loaded ammo.
   * For melee weapons, this is undefined.
   */
  loadedAmmo?: WeaponAmmoState;
};

export const createWeaponEntity = (id: ItemURN, schema: WeaponSchema, loadedAmmo?: WeaponAmmoState): WeaponEntity => {
  if (loadedAmmo && !('ammo' in schema)) {
    throw new Error('Weapon schema does not require ammo, but loaded ammo was provided');
  }

  return {
    id,
    schema: schema.urn,
    loadedAmmo,
  };
}

/**
 * Load ammo into a weapon (mutates weapon directly)
 */
export const loadWeapon = (
  weapon: WeaponEntity,
  weaponSchema: WeaponSchema,
  ammoSchema: AmmoSchema
): void => {
  // Validate weapon can use this ammo type
  if (!('ammo' in weaponSchema) || weaponSchema.ammo.type !== ammoSchema.urn) {
    throw new Error(`Weapon ${weapon.schema} cannot use ammo type ${ammoSchema.urn}`);
  }

  weapon.loadedAmmo ??= {} as WeaponAmmoState;
  weapon.loadedAmmo.type = ammoSchema.urn;
  weapon.loadedAmmo.remaining = weaponSchema.ammo.capacity;
};

/**
 * Fire the weapon, consuming ammo (mutates weapon directly)
 */
export const fireWeapon = (weapon: WeaponEntity, ammoCount: AmmoCount = 1): void => {
  if (!weapon.loadedAmmo || weapon.loadedAmmo.remaining <= 0) {
    throw new Error('Cannot fire weapon with no ammo loaded');
  }

  if (ammoCount <= 0 && ammoCount !== ALL_REMAINING_AMMO) {
    throw new Error('Ammo count must be positive');
  }

  if (ammoCount === ALL_REMAINING_AMMO) {
    weapon.loadedAmmo.remaining = 0;
    return;
  }

  if (weapon.loadedAmmo.remaining < ammoCount) {
    throw new Error(`Insufficient ammo: need ${ammoCount}, have ${weapon.loadedAmmo.remaining}`);
  }

  weapon.loadedAmmo.remaining -= ammoCount;
};

/**
 * Check if weapon is loaded and ready to fire
 */
export const isWeaponLoaded = (weapon: WeaponEntity): boolean => {
  return weapon.loadedAmmo !== undefined && weapon.loadedAmmo.remaining > 0;
};

/**
 * Check if weapon needs reloading
 */
export const needsReload = (weapon: WeaponEntity): boolean => {
  return weapon.loadedAmmo === undefined || weapon.loadedAmmo.remaining === 0;
};
