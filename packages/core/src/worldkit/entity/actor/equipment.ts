import { Actor } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { AnatomyURN, ItemURN, WeaponItemURN } from '~/types/taxonomy';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';
import { ActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { SchemaManager, SchemaRegistry } from '~/worldkit/schema/manager';
import { BARE_HANDS_WEAPON_DO_NOT_DELETE } from '~/worldkit/schema/weapon';

export const WEAPON_EQUIPMENT_ANATOMICAL_LOCATIONS: AnatomyURN[] = [
  HumanAnatomy.RIGHT_HAND,
  HumanAnatomy.LEFT_HAND,
  HumanAnatomy.RIGHT_SHOULDER,
  HumanAnatomy.LEFT_SHOULDER,
];

export type ActorEquipmentApiDependencies = {
  allowedAnatomicalLocations?: AnatomyURN[];
};

export const DEFAULT_ACTOR_EQUIPMENT_DEPS: Readonly<ActorEquipmentApiDependencies> = {
  allowedAnatomicalLocations: WEAPON_EQUIPMENT_ANATOMICAL_LOCATIONS,
};

export type ActorEquipmentApi = {
  /**
   * Gets the equipped weapon at the supplied possible anatomical locations
   * @param locations - The locations to search for the equipped weapon
   * @returns The equipped weapon or null if no weapon is equipped
   */
  getEquippedWeapon: (actor: Actor, locations?: AnatomyURN[]) => WeaponItemURN | null;

  getEquippedWeaponSchema: (actor: Actor, locations?: AnatomyURN[]) => WeaponSchema;
  /**
   * @deprecated Just use `getEquippedWeaponSchema`
   */
  getEquippedWeaponSchemaOrFail: (actor: Actor, locations?: AnatomyURN[]) => WeaponSchema;
  equipWeapon: (actor: Actor, itemId: WeaponItemURN) => void;
  unequipWeapon: (actor: Actor, itemId: WeaponItemURN) => void;
  /**
   * Removes undefined entries and empty location objects from equipment
   */
  cleanupEquipment: (actor: Actor) => void;
};

export function createActorEquipmentApi (
  schemaManager: SchemaManager,
  inventoryApi: ActorInventoryApi,
  deps: ActorEquipmentApiDependencies = DEFAULT_ACTOR_EQUIPMENT_DEPS,
): ActorEquipmentApi {

  const {
    allowedAnatomicalLocations: allowedAnatomicalLocations = WEAPON_EQUIPMENT_ANATOMICAL_LOCATIONS,
  } = deps;

  function ensureEquipment(actor: Actor) {
    actor.equipment ??= {};
  }

  function getEquippedWeapon(actor: Actor, possibleLocations: AnatomyURN[] = allowedAnatomicalLocations): WeaponItemURN | null {
    if (!actor)  {
      throw new Error('Actor argument is required');
    }

    ensureEquipment(actor);

    for (let location of possibleLocations) {
      const equipmentSlots = actor.equipment[location];
      if (equipmentSlots) {
        for (let itemId in equipmentSlots) {
          if (equipmentSlots[itemId as WeaponItemURN] === 1) {
            return itemId as WeaponItemURN;
          }
        }
      }
    }
    return null;
  }

  function getEquippedWeaponSchema(actor: Actor, possibleLocations: AnatomyURN[] = allowedAnatomicalLocations): WeaponSchema {
    const weaponId = getEquippedWeapon(actor, possibleLocations);
    if (!weaponId) {
      // Actor is never truly unarmed - return bare hands weapon
      return BARE_HANDS_WEAPON_DO_NOT_DELETE;
    }

    const item = inventoryApi.getItem(actor, weaponId);
    const schema = schemaManager.getSchema(item.schema as keyof SchemaRegistry);
    return schema as WeaponSchema;
  }

  function getEquippedWeaponSchemaOrFail(actor: Actor, possibleLocations: AnatomyURN[] = allowedAnatomicalLocations): WeaponSchema {
    // Since getEquippedWeaponSchema now always returns a weapon (including bare hands), this never fails
    return getEquippedWeaponSchema(actor, possibleLocations);
  }

  function equipWeapon(actor: Actor, itemId: WeaponItemURN) {
    ensureEquipment(actor);

    const item = inventoryApi.getItem(actor, itemId);
    const schema = schemaManager.getSchemaOrFail(item.schema as keyof SchemaRegistry);

    if ('fit' in schema && schema.fit) {
      // First, check for conflicts
      for (let anatomyUrn in schema.fit) {
        const equipmentSlots = actor.equipment[anatomyUrn as AnatomyURN];

        if (equipmentSlots) {
          for (let existingItemId in equipmentSlots) {
            if (equipmentSlots[existingItemId as WeaponItemURN] === 1) {
              throw new Error('Equipment slot already occupied');
            }
          }
        }
      }

      // If no conflicts, proceed with equipping
      for (let anatomyUrn in schema.fit) {
        actor.equipment[anatomyUrn as AnatomyURN] ??= {};
        actor.equipment[anatomyUrn as AnatomyURN]![itemId] = 1;
      }
    }
  }

  function unequipWeapon(actor: Actor, itemId: WeaponItemURN) {
    const item = inventoryApi.getItem(actor, itemId);
    const schema = schemaManager.getSchemaOrFail(item.schema as keyof SchemaRegistry);
    if ('fit' in schema && schema.fit) {
      for (let location in schema.fit) {
        delete actor.equipment[location as AnatomyURN]![itemId];
      }
    }
  }

  function cleanupEquipment(actor: Actor): void {
    for (let anatomyUrn in actor.equipment) {
      const equipmentSlots = actor.equipment[anatomyUrn as AnatomyURN];

      if (equipmentSlots) {
        // Remove undefined entries from this location
        for (let itemId in equipmentSlots) {
          if (equipmentSlots[itemId as ItemURN] === undefined) {
            delete equipmentSlots[itemId as ItemURN];
          }
        }

        // Remove the entire location object if it's now empty
        let hasItems = false;
        for (let _ in equipmentSlots) {
          hasItems = true;
          break;
        }

        if (!hasItems) {
          delete actor.equipment[anatomyUrn as AnatomyURN];
        }
      }
    }
  }

  return {
    getEquippedWeapon,
    getEquippedWeaponSchema,
    getEquippedWeaponSchemaOrFail,
    equipWeapon,
    unequipWeapon,
    cleanupEquipment,
  };
}
