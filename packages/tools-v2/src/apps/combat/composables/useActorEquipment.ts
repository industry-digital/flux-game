import type { ActorSetupData } from '../types';
import type { TransformerContext, WeaponSchema } from '@flux/core';

export type ActorEquipmentAPI = {
  equipWeapon: (actor: ActorSetupData, weaponSchema: WeaponSchema) => void;
  unequipWeapon: (actor: ActorSetupData, weaponUrn: string) => void;
  getEquippedWeapon: (actor: ActorSetupData) => any | null;
  updateActorWeapon: (actor: ActorSetupData, weaponUrn: string, availableWeapons: WeaponSchema[]) => void;
  registerWeaponSchemas: (weaponSchemas: WeaponSchema[]) => void;
};

/**
 * Composable for managing actor equipment using TransformerContext's built-in APIs
 */
export function useActorEquipment(context: TransformerContext): ActorEquipmentAPI {
  const { inventoryApi, equipmentApi, schemaManager } = context;

  const equipWeapon = (actor: ActorSetupData, weaponSchema: WeaponSchema): void => {
    console.log('[useActorEquipment] equipWeapon called:', {
      actorId: actor.id,
      weaponSchemaUrn: weaponSchema.urn,
      weaponSchemaName: weaponSchema.name,
    });

    try {
      inventoryApi.refreshInventory(actor);

      // Create weapon item using the context's inventory API
      const weaponItem = inventoryApi.addItem(actor, {
        schema: weaponSchema.urn,
      });

      console.log('[useActorEquipment] Created weapon item:', {
        itemId: weaponItem.id,
        schema: weaponItem.schema,
      });

      // Equip the weapon using the context's equipment API
      equipmentApi.equipWeapon(actor, weaponItem.id as any);

      // Set convenience properties for compatibility
      actor.weapon = weaponItem;
      actor.weaponUrn = weaponSchema.urn;

      console.log('[useActorEquipment] Weapon equipped successfully:', {
        actorId: actor.id,
        weaponId: weaponItem.id,
        weaponUrn: actor.weaponUrn,
      });
    } catch (error) {
      console.error('[useActorEquipment] Failed to equip weapon:', error);
      throw error;
    }
  };

  const unequipWeapon = (actor: ActorSetupData, weaponUrn: string): void => {
    console.log('[useActorEquipment] unequipWeapon called:', {
      actorId: actor.id,
      weaponUrn,
    });

    try {
      // Find the equipped weapon
      const equippedWeaponId = context.equipmentApi.getEquippedWeapon(actor);

      if (equippedWeaponId) {
        // Unequip the weapon
        context.equipmentApi.unequipWeapon(actor, equippedWeaponId);

        // Remove from inventory
        context.inventoryApi.removeItem(actor, equippedWeaponId);

        // Clear convenience properties
        delete actor.weapon;
        delete actor.weaponUrn;

        console.log('[useActorEquipment] Weapon unequipped successfully:', {
          actorId: actor.id,
          weaponId: equippedWeaponId,
        });
      }
    } catch (error) {
      console.error('[useActorEquipment] Failed to unequip weapon:', error);
      throw error;
    }
  };

  const getEquippedWeapon = (actor: ActorSetupData): any | null => {
    try {
      const weaponId = context.equipmentApi.getEquippedWeapon(actor);
      if (!weaponId) return null;

      return context.inventoryApi.getItem(actor, weaponId);
    } catch (error) {
      console.warn('[useActorEquipment] Failed to get equipped weapon:', error);
      return null;
    }
  };

  const updateActorWeapon = (actor: ActorSetupData, weaponUrn: string, availableWeapons: WeaponSchema[]): void => {
    console.log('[useActorEquipment] updateActorWeapon called:', {
      actorId: actor.id,
      weaponUrn,
      availableWeaponsCount: availableWeapons.length,
    });

    try {
      // Find the weapon schema
      const weaponSchema = availableWeapons.find(w => w.urn === weaponUrn);
      if (!weaponSchema) {
        throw new Error(`Weapon schema not found for URN: ${weaponUrn}`);
      }

      // Unequip current weapon if any
      const currentWeapon = getEquippedWeapon(actor);
      if (currentWeapon) {
        unequipWeapon(actor, currentWeapon.schema);
      }

      // Equip new weapon
      equipWeapon(actor, weaponSchema);

      console.log('[useActorEquipment] Actor weapon updated successfully:', {
        actorId: actor.id,
        newWeaponUrn: weaponUrn,
      });
    } catch (error) {
      console.error('[useActorEquipment] Failed to update actor weapon:', error);
      throw error;
    }
  };

  const registerWeaponSchemas = (weaponSchemas: WeaponSchema[]): void => {
    console.log('[useActorEquipment] registerWeaponSchemas called:', {
      weaponCount: weaponSchemas.length,
      weaponUrns: weaponSchemas.map(w => w.urn),
    });

    try {
      // Create a loader function that returns a Map of weapon schemas
      const weaponLoader = () => {
        const schemaMap = new Map<string, WeaponSchema>();
        for (const weaponSchema of weaponSchemas) {
          schemaMap.set(weaponSchema.urn, weaponSchema);
        }
        return schemaMap;
      };

      // Register the loader with the schema manager
      schemaManager.registerLoader('weapon', weaponLoader, true);

      // Force reload all schemas to ensure they're available
      schemaManager.loadAllSchemas(true);

      console.log('[useActorEquipment] Weapon schemas registered successfully:', {
        registeredUrns: weaponSchemas.map(w => w.urn),
      });
    } catch (error) {
      console.error('[useActorEquipment] Failed to register weapon schemas:', error);
      throw error;
    }
  };

  return {
    equipWeapon,
    unequipWeapon,
    getEquippedWeapon,
    updateActorWeapon,
    registerWeaponSchemas,
  };
}
