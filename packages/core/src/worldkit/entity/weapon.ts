import { AmmoSchema } from '~/types/schema/ammo';
import { WeaponSchema } from '~/types/schema/weapon';
import { AmmoSchemaURN, ItemURN, WeaponSchemaURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import { SchemaManager } from '~/worldkit/schema/manager';
import { ActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { ActorEquipmentApi } from '~/worldkit/entity/actor/equipment';

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

/**
 * Unload weapon, returning the amount of ammo that was unloaded
 * Weapon is cleared to empty state
 */
export const unloadWeapon = (weapon: WeaponEntity): number => {
  if (!weapon.loadedAmmo || weapon.loadedAmmo.remaining <= 0) {
    weapon.loadedAmmo = undefined;
    return 0;
  }

  const unloadedCount = weapon.loadedAmmo.remaining;
  weapon.loadedAmmo = undefined;

  return unloadedCount;
};

export type AmmoConsumedResult = { schema: AmmoSchemaURN, amount: number };
export type AmmoReturnedResult = { schema: AmmoSchemaURN | undefined, amount: number };

export type ActorWeaponApi = {
  // UNIFIED AMMO MANAGEMENT
  addAmmoToInventory: (actor: Actor, type: AmmoSchemaURN, amount: number) => void;
  removeAmmoFromInventory: (actor: Actor, type: AmmoSchemaURN, amount: number) => void;
  getAmmoCount: (actor: Actor, type: AmmoSchemaURN) => number;
  hasAmmo: (actor: Actor, type: AmmoSchemaURN, amount: number) => boolean;

  // WEAPON-AMMO INTEGRATION
  reloadWeapon: (actor: Actor, weaponId: ItemURN) => AmmoConsumedResult;
  unloadWeapon: (actor: Actor, weaponId: ItemURN) => AmmoReturnedResult;

  // WEAPON STATE QUERIES
  isWeaponLoaded: (actor: Actor, weaponId: ItemURN) => boolean;
  needsReload: (actor: Actor, weaponId: ItemURN) => boolean;
  getLoadedAmmoCount: (actor: Actor, weaponId: ItemURN) => number;
  getWeaponEntity: (actor: Actor, weaponId: ItemURN) => WeaponEntity;
};

export const createActorWeaponApi = (
  schemaManager: SchemaManager,
  inventoryApi: ActorInventoryApi,
  equipmentApi: ActorEquipmentApi,
): ActorWeaponApi => {
  const addAmmoToInventory = (actor: Actor, type: AmmoSchemaURN, amount: number): void => {
    if (amount <= 0) return;

    const ammoSchema = schemaManager.getSchema(type);

    // Initialize unified ammo storage
    actor.inventory.ammo ??= {};

    // Add to existing magazine or create new one (O(1) operation)
    actor.inventory.ammo[type] = (actor.inventory.ammo[type] || 0) + amount;

    // Update inventory mass and timestamp
    actor.inventory.mass += ammoSchema.baseMass * amount;
    actor.inventory.ts = Date.now();
  };

  const removeAmmoFromInventory = (actor: Actor, type: AmmoSchemaURN, amount: number): void => {
    if (amount <= 0) return;

    const available = actor.inventory.ammo?.[type] || 0;
    if (available < amount) {
      throw new Error(`Insufficient ammo: need ${amount}, have ${available} of type ${type}`);
    }

    actor.inventory.ammo[type] -= amount;
    if (actor.inventory.ammo[type] <= 0) {
      delete actor.inventory.ammo[type];
    }

    inventoryApi.refreshInventory(actor);
  };

  const getAmmoCount = (actor: Actor, type: AmmoSchemaURN): number => {
    return actor.inventory.ammo?.[type] || 0;
  };

  const hasAmmo = (actor: Actor, type: AmmoSchemaURN, amount: number): boolean => {
    return getAmmoCount(actor, type) >= amount;
  };

  const getWeaponEntity = (actor: Actor, weaponId: ItemURN): WeaponEntity => {
    return inventoryApi.getItem(actor, weaponId) as WeaponEntity;
  };

  const reloadWeapon = (actor: Actor, weaponId: ItemURN): AmmoConsumedResult => {
    const weaponSchema = equipmentApi.getEquippedWeaponSchema(actor);
    if (!('ammo' in weaponSchema)) {
      throw new Error('Weapon does not use ammo');
    }

    const ammoType = weaponSchema.ammo.type;
    const capacity = weaponSchema.ammo.capacity;

    // Check if player has enough ammo
    if (!hasAmmo(actor, ammoType, capacity)) {
      const available = getAmmoCount(actor, ammoType);
      throw new Error(`Insufficient ammo to reload: need ${capacity}, have ${available}`);
    }

    // Remove ammo from inventory
    removeAmmoFromInventory(actor, ammoType, capacity);

    // Load weapon (pure operation)
    const weapon = getWeaponEntity(actor, weaponId);
    const ammoSchema = schemaManager.getSchema(ammoType);
    loadWeapon(weapon, weaponSchema, ammoSchema);

    return { schema: ammoType, amount: capacity };
  };

  const unloadWeaponFromActor = (actor: Actor, weaponId: ItemURN): AmmoReturnedResult => {
    const weapon = getWeaponEntity(actor, weaponId);

    if (!weapon.loadedAmmo) {
      return { schema: undefined, amount: 0 };
    }

    // Store ammo type before unloading (since unloadWeapon clears loadedAmmo)
    const ammoType = weapon.loadedAmmo.type;

    // Unload weapon (pure operation)
    const ammoReturned = unloadWeapon(weapon);
    if (ammoReturned > 0) {
      // Return ammo to inventory
      addAmmoToInventory(actor, ammoType, ammoReturned);
    }

    return { schema: ammoType, amount: ammoReturned };
  };

  const isWeaponLoadedFn = (actor: Actor, weaponId: ItemURN): boolean => {
    const weapon = getWeaponEntity(actor, weaponId);
    return isWeaponLoaded(weapon);
  };

  const needsReloadFn = (actor: Actor, weaponId: ItemURN): boolean => {
    const weapon = getWeaponEntity(actor, weaponId);
    return needsReload(weapon);
  };

  const getLoadedAmmoCount = (actor: Actor, weaponId: ItemURN): number => {
    const weapon = getWeaponEntity(actor, weaponId);
    return weapon.loadedAmmo?.remaining || 0;
  };


  return {
    addAmmoToInventory,
    removeAmmoFromInventory,
    getAmmoCount,
    hasAmmo,
    reloadWeapon,
    unloadWeapon: unloadWeaponFromActor,
    isWeaponLoaded: isWeaponLoadedFn,
    needsReload: needsReloadFn,
    getLoadedAmmoCount,
    getWeaponEntity,
  };
};
