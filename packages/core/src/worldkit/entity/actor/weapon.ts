import { AmmoSchemaURN, ItemURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import { SchemaManager } from '~/worldkit/schema/manager';
import { ActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { ActorEquipmentApi } from '~/worldkit/entity/actor/equipment';
import {
  WeaponEntity,
  loadWeapon,
  unloadWeapon,
  isWeaponLoaded,
  needsReload,
} from '~/worldkit/entity/weapon';
import { PotentiallyImpureOperations } from '~/types/handler';
import { timestamp } from '~/lib/timestamp';

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

export type ActorWeaponApiDependencies = {
  timestamp: PotentiallyImpureOperations['timestamp'];
};

const DEFAULT_ACTOR_WEAPON_API_DEPENDENCIES: Readonly<ActorWeaponApiDependencies> = {
  timestamp,
};

export const createActorWeaponApi = (
  schemaManager: SchemaManager,
  inventoryApi: ActorInventoryApi,
  equipmentApi: ActorEquipmentApi,
  deps: ActorWeaponApiDependencies = DEFAULT_ACTOR_WEAPON_API_DEPENDENCIES,
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
    actor.inventory.ts = deps.timestamp();
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
