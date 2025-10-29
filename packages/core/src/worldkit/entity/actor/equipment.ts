import { Equipment } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { AnatomyURN, ItemURN } from '~/types/taxonomy';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';
import { ActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { SchemaManager, SchemaRegistry } from '~/worldkit/schema/manager';
import { BARE_HANDS_WEAPON_DO_NOT_DELETE } from '~/worldkit/schema/weapon';
import { EntityWithInventory } from '~/worldkit/entity/actor/inventory';
import { ShellComponent } from '~/types/entity/item';
import { ErrorCode } from '~/types/error';

export type EntityWithEquipment = EntityWithInventory & {
  equipment: Equipment;
};

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
  getEquippedWeapon: (entity: EntityWithEquipment, locations?: AnatomyURN[]) => ItemURN | null;

  getEquippedWeaponSchema: (entity: EntityWithEquipment, locations?: AnatomyURN[]) => WeaponSchema;
  /**
   * @deprecated Just use `getEquippedWeaponSchema`
   */
  getEquippedWeaponSchemaOrFail: (entity: EntityWithEquipment, locations?: AnatomyURN[]) => WeaponSchema;
  /**
   * Equips the given item
   * Fit is determined by the item schema's `fit`
   */
  equip: (entity: EntityWithEquipment, itemId: ItemURN) => void;
  /**
   * Unequips the given item
   * Fit is determined by the item schema's `fit`
   */
  unequip: (entity: EntityWithEquipment, itemId: ItemURN) => void;

  /**
   * Gets the equipped components
   */
  getMountedComponents: (entity: EntityWithEquipment, output?: ShellComponent[]) => ShellComponent[];

  /**
   * Removes undefined entries and empty location objects from equipment
   */
  cleanupEquipment: (entity: EntityWithEquipment) => void;
};

export function createActorEquipmentApi (
  schemaManager: SchemaManager,
  inventoryApi: ActorInventoryApi,
  deps: ActorEquipmentApiDependencies = DEFAULT_ACTOR_EQUIPMENT_DEPS,
): ActorEquipmentApi {

  const {
    allowedAnatomicalLocations: allowedAnatomicalLocations = WEAPON_EQUIPMENT_ANATOMICAL_LOCATIONS,
  } = deps;

  function ensureEquipment(entity: EntityWithEquipment) {
    entity.equipment ??= {};
  }

  function getEquippedWeapon(entity: EntityWithEquipment, possibleLocations: AnatomyURN[] = allowedAnatomicalLocations): ItemURN | null {
    if (!entity)  {
      throw new Error('Entity argument is required');
    }

    ensureEquipment(entity);

    for (let location of possibleLocations) {
      const equipmentSlots = entity.equipment[location];
      if (equipmentSlots) {
        for (let itemId in equipmentSlots) {
          if (equipmentSlots[itemId as ItemURN] === 1) {
            return itemId as ItemURN;
          }
        }
      }
    }
    return null;
  }

  function getEquippedWeaponSchema(entity: EntityWithEquipment, possibleLocations: AnatomyURN[] = allowedAnatomicalLocations): WeaponSchema {
    const weaponId = getEquippedWeapon(entity, possibleLocations);
    if (!weaponId) {
      // Entity is never truly unarmed - return bare hands weapon
      return BARE_HANDS_WEAPON_DO_NOT_DELETE;
    }

    const item = inventoryApi.getItem(entity, weaponId);
    const schema = schemaManager.getSchema(item.schema as keyof SchemaRegistry);
    return schema as WeaponSchema;
  }

  function getEquippedWeaponSchemaOrFail(entity: EntityWithEquipment, possibleLocations: AnatomyURN[] = allowedAnatomicalLocations): WeaponSchema {
    // Since getEquippedWeaponSchema now always returns a weapon (including bare hands), this never fails
    return getEquippedWeaponSchema(entity, possibleLocations);
  }

  function equip(entity: EntityWithEquipment, itemId: ItemURN) {
    ensureEquipment(entity);

    const item = inventoryApi.getItem(entity, itemId);
    const schema = schemaManager.getSchemaOrFail(item.schema as keyof SchemaRegistry);

    if ('fit' in schema && schema.fit) {
      // First, check for conflicts
      for (let anatomyUrn in schema.fit) {
        const equipmentSlots = entity.equipment[anatomyUrn as AnatomyURN];

        if (equipmentSlots) {
          for (let existingItemId in equipmentSlots) {
            if (equipmentSlots[existingItemId as ItemURN] === 1) {
              throw new Error(ErrorCode.CONFLICT);
            }
          }
        }
      }

      // If no conflicts, proceed with equipping
      for (let anatomyUrn in schema.fit) {
        entity.equipment[anatomyUrn as AnatomyURN] ??= {};
        entity.equipment[anatomyUrn as AnatomyURN]![itemId] = 1;
      }
    }
  }

  function unequip(entity: EntityWithEquipment, itemId: ItemURN) {
    const item = inventoryApi.getItem(entity, itemId);
    const schema = schemaManager.getSchemaOrFail(item.schema as keyof SchemaRegistry);
    if ('fit' in schema && schema.fit) {
      for (let location in schema.fit) {
        delete entity.equipment[location as AnatomyURN]![itemId];
      }
    }
  }

  function cleanupEquipment(entity: EntityWithEquipment): void {
    for (let anatomyUrn in entity.equipment) {
      const equipmentSlots = entity.equipment[anatomyUrn as AnatomyURN];

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
          delete entity.equipment[anatomyUrn as AnatomyURN];
        }
      }
    }
  }

  function getMountedComponents(
    entity: EntityWithEquipment,
    output: ShellComponent[] = [], // Consumers may opt into zero-allocation by passing an empty array
  ): ShellComponent[] {
    output.length = 0;

    if (!entity) {
      throw new Error('Entity argument is required');
    }

    ensureEquipment(entity);

    for (let location in entity.equipment) {
      const equipmentSlots = entity.equipment[location as AnatomyURN];
      if (equipmentSlots) {
        for (let itemId in equipmentSlots) {
          if (equipmentSlots[itemId as ItemURN] === 1) {
            const item = inventoryApi.getItem(entity, itemId as ItemURN);
            // Check if this is a component by schema URN pattern
            if (item.schema.startsWith('flux:schema:component:')) {
              output.push(item as ShellComponent);
            }
          }
        }
      }
    }

    return output;
  }

  return {
    getEquippedWeapon,
    getEquippedWeaponSchema,
    getEquippedWeaponSchemaOrFail,
    equip,
    unequip,
    cleanupEquipment,
    getMountedComponents,
  };
}
