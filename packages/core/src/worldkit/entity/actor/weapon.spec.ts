import { describe, it, expect, beforeEach } from 'vitest';
import {
    createActorWeaponApi,
    AmmoConsumedResult,
    AmmoReturnedResult,
} from './weapon';
import { createTestWeapon } from '../../combat/testing/weapon';
import { AmmoSchema } from '~/types/schema/ammo';
import { createAmmoSchema } from '~/worldkit/schema/ammo/factory';
import { DamageType } from '~/types/damage';
import { Actor } from '~/types/entity/actor';
import { TransformerContext } from '~/types/handler';
import { createTestTransformerContext } from '~/testing/context-testing';
import { createActor } from '~/worldkit/entity/actor';
import { DEFAULT_TIMESTAMP } from '~/testing/constants';
import { registerWeapons } from '~/worldkit/combat/testing/schema';
import { SchemaManager } from '~/worldkit/schema/manager';
import { fireWeapon } from '~/worldkit/entity/weapon';

const NOW = DEFAULT_TIMESTAMP;
const ONE_MINUTE_AGO = NOW - (60 * 1000);
const ONE_MINUTE_FROM_NOW = NOW + (60 * 1000);

describe('ActorWeaponApi', () => {
  let context: TransformerContext;
  let actor: Actor;
  let weaponApi: ReturnType<typeof createActorWeaponApi>;

  const rifleWeapon = createTestWeapon((schema) => ({
    ...schema,
    urn: 'flux:schema:weapon:test-rifle',
    name: 'Test Rifle',
    ammo: {
      type: 'flux:schema:ammo:test-bullet',
      capacity: 30,
    },
  }));

  const testBulletSchema = createAmmoSchema((schema: AmmoSchema) => ({
    ...schema,
    urn: 'flux:schema:ammo:test-bullet',
    name: 'Test Bullet',
    baseMass: 12,
    damage: {
      base: '3d6',
      types: {
        [DamageType.KINETIC]: 1.0,
      },
    },
  }));

  beforeEach(() => {
    // Create a fresh SchemaManager instead of using the pre-loaded one
    const freshSchemaManager = new SchemaManager();

    // Register test schemas using the helper function
    registerWeapons(freshSchemaManager, [rifleWeapon]);
    freshSchemaManager.registerLoader('ammo', () => new Map([
      ['flux:schema:ammo:test-bullet', testBulletSchema as any]
    ]), true);
    freshSchemaManager.loadAllSchemas();

    // Create context with the fresh schema manager
    context = createTestTransformerContext({
      schemaManager: freshSchemaManager
    });

    // Create test actor
    actor = createActor();
    context.world.actors[actor.id] = actor;

    // Use the weapon API from context (now created with correct schema manager)
    weaponApi = context.weaponApi;
  });

  describe('Unified Ammo Management', () => {
    describe('addAmmoToInventory', () => {
      it('adds ammo to empty inventory', () => {
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBeUndefined();

        weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', 50);

        expect(actor.inventory.ammo).toBeDefined();
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(50);
        expect(actor.inventory.mass).toBe(50 * 12); // 50 bullets * 12g each
      });

      it('merges with existing ammo (smart magazine)', () => {
        // Add initial ammo
        weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', 30);
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(30);

        // Add more ammo - should merge
        weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', 20);
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(50);
        expect(actor.inventory.mass).toBe(50 * 12);
      });

      it('handles zero and negative amounts gracefully', () => {
        weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', 0);
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBeUndefined();

        weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', -5);
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBeUndefined();
      });

      it('updates inventory timestamp', () => {
        // Set initial timestamp to past
        actor.inventory.ts = ONE_MINUTE_AGO;

        weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', 10);

        expect(actor.inventory.ts).toBeGreaterThan(ONE_MINUTE_AGO);
      });
    });

    describe('removeAmmoFromInventory', () => {
      beforeEach(() => {
        weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', 100);
      });

      it('removes ammo from unified magazine', () => {
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(100);

        weaponApi.removeAmmoFromInventory(actor, 'flux:schema:ammo:test-bullet', 30);

        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(70);
      });

      it('deletes empty ammo entries', () => {
        weaponApi.removeAmmoFromInventory(actor, 'flux:schema:ammo:test-bullet', 100);

        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBeUndefined();
      });

      it('throws on insufficient ammo', () => {
        expect(() => {
          weaponApi.removeAmmoFromInventory(actor, 'flux:schema:ammo:test-bullet', 150);
        }).toThrow('Insufficient ammo: need 150, have 100 of type flux:schema:ammo:test-bullet');
      });

      it('handles zero and negative amounts gracefully', () => {
        const originalAmount = actor.inventory.ammo['flux:schema:ammo:test-bullet'];

        weaponApi.removeAmmoFromInventory(actor, 'flux:schema:ammo:test-bullet', 0);
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(originalAmount);

        weaponApi.removeAmmoFromInventory(actor, 'flux:schema:ammo:test-bullet', -5);
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(originalAmount);
      });
    });

    describe('getAmmoCount & hasAmmo', () => {
      it('returns correct counts for existing ammo', () => {
        weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', 75);

        expect(weaponApi.getAmmoCount(actor, 'flux:schema:ammo:test-bullet')).toBe(75);
        expect(weaponApi.hasAmmo(actor, 'flux:schema:ammo:test-bullet', 50)).toBe(true);
        expect(weaponApi.hasAmmo(actor, 'flux:schema:ammo:test-bullet', 75)).toBe(true);
        expect(weaponApi.hasAmmo(actor, 'flux:schema:ammo:test-bullet', 76)).toBe(false);
      });

      it('handles missing ammo types', () => {
        expect(weaponApi.getAmmoCount(actor, 'flux:schema:ammo:nonexistent')).toBe(0);
        expect(weaponApi.hasAmmo(actor, 'flux:schema:ammo:nonexistent', 1)).toBe(false);
      });

      it('handles empty inventory', () => {
        expect(weaponApi.getAmmoCount(actor, 'flux:schema:ammo:test-bullet')).toBe(0);
        expect(weaponApi.hasAmmo(actor, 'flux:schema:ammo:test-bullet', 1)).toBe(false);
      });
    });
  });

  describe('Weapon-Ammo Integration', () => {
    let weaponItem: ReturnType<typeof context.inventoryApi.addItem>;

    beforeEach(() => {
      // Clear any existing equipment to avoid conflicts
      actor.equipment = {};

      // Add weapon to inventory and equip it
      weaponItem = context.inventoryApi.addItem(actor, { schema: rifleWeapon.urn });
      context.equipmentApi.equipWeapon(actor, weaponItem.id);

      // Add ammo to inventory
      weaponApi.addAmmoToInventory(actor, 'flux:schema:ammo:test-bullet', 90);
    });

    describe('reloadWeapon', () => {
      it('consumes ammo from inventory and loads weapon', () => {
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(90);

        const result: AmmoConsumedResult = weaponApi.reloadWeapon(actor, weaponItem.id);

        expect(result.schema).toBe('flux:schema:ammo:test-bullet');
        expect(result.amount).toBe(30); // Rifle capacity
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(60); // 90 - 30

        // Weapon should be loaded
        expect(weaponApi.isWeaponLoaded(actor, weaponItem.id)).toBe(true);
        expect(weaponApi.getLoadedAmmoCount(actor, weaponItem.id)).toBe(30);
      });

      it('throws on insufficient ammo', () => {
        // Remove most ammo, leaving only 20
        weaponApi.removeAmmoFromInventory(actor, 'flux:schema:ammo:test-bullet', 70);

        expect(() => {
          weaponApi.reloadWeapon(actor, weaponItem.id);
        }).toThrow('Insufficient ammo to reload: need 30, have 20');
      });

      it('throws for melee weapons', () => {
        const meleeWeapon = createTestWeapon(); // No ammo property
        context.schemaManager.registerLoader('weapon', () => new Map([
          [meleeWeapon.urn, meleeWeapon]
        ]), true);
        context.schemaManager.loadAllSchemas(true);

        // Unequip existing weapon first to avoid slot conflict
        context.equipmentApi.unequipWeapon(actor, weaponItem.id);

        const meleeItem = context.inventoryApi.addItem(actor, { schema: meleeWeapon.urn });
        context.equipmentApi.equipWeapon(actor, meleeItem.id);

        expect(() => {
          weaponApi.reloadWeapon(actor, meleeItem.id);
        }).toThrow('Weapon does not use ammo');
      });
    });

    describe('unloadWeapon', () => {
      beforeEach(() => {
        // Load weapon first
        weaponApi.reloadWeapon(actor, weaponItem.id);
        expect(weaponApi.getLoadedAmmoCount(actor, weaponItem.id)).toBe(30);
      });

      it('returns ammo to inventory and clears weapon', () => {
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(60); // After reload

        const result: AmmoReturnedResult = weaponApi.unloadWeapon(actor, weaponItem.id);

        expect(result.schema).toBe('flux:schema:ammo:test-bullet');
        expect(result.amount).toBe(30);
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(90); // 60 + 30 returned

        // Weapon should be unloaded
        expect(weaponApi.isWeaponLoaded(actor, weaponItem.id)).toBe(false);
        expect(weaponApi.getLoadedAmmoCount(actor, weaponItem.id)).toBe(0);
      });

      it('handles partially used weapon', () => {
        // Fire some rounds
        const weapon = weaponApi.getWeaponEntity(actor, weaponItem.id);
        fireWeapon(weapon, 10); // Use 10 rounds

        expect(weaponApi.getLoadedAmmoCount(actor, weaponItem.id)).toBe(20);

        const result = weaponApi.unloadWeapon(actor, weaponItem.id);

        expect(result.amount).toBe(20);
        expect(actor.inventory.ammo['flux:schema:ammo:test-bullet']).toBe(80); // 60 + 20 returned
      });

      it('handles unloaded weapons gracefully', () => {
        // Unload first
        weaponApi.unloadWeapon(actor, weaponItem.id);

        // Unload again
        const result = weaponApi.unloadWeapon(actor, weaponItem.id);

        expect(result.schema).toBeUndefined();
        expect(result.amount).toBe(0);
      });
    });

    describe('weapon state queries', () => {
      it('correctly reports weapon state', () => {
        // Initially unloaded
        expect(weaponApi.isWeaponLoaded(actor, weaponItem.id)).toBe(false);
        expect(weaponApi.needsReload(actor, weaponItem.id)).toBe(true);
        expect(weaponApi.getLoadedAmmoCount(actor, weaponItem.id)).toBe(0);

        // After loading
        weaponApi.reloadWeapon(actor, weaponItem.id);
        expect(weaponApi.isWeaponLoaded(actor, weaponItem.id)).toBe(true);
        expect(weaponApi.needsReload(actor, weaponItem.id)).toBe(false);
        expect(weaponApi.getLoadedAmmoCount(actor, weaponItem.id)).toBe(30);

        // After firing
        const weapon = weaponApi.getWeaponEntity(actor, weaponItem.id);
        fireWeapon(weapon, 30); // Empty the weapon
        expect(weaponApi.isWeaponLoaded(actor, weaponItem.id)).toBe(false);
        expect(weaponApi.needsReload(actor, weaponItem.id)).toBe(true);
        expect(weaponApi.getLoadedAmmoCount(actor, weaponItem.id)).toBe(0);
      });
    });
  });
});
