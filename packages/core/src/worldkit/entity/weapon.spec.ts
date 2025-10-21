import { describe, it, expect, beforeEach } from 'vitest';
import {
  WeaponAmmoState,
  createWeaponEntity,
  loadWeapon,
  fireWeapon,
  isWeaponLoaded,
  needsReload,
  unloadWeapon,
  ALL_REMAINING_AMMO,
  createActorWeaponApi,
  AmmoConsumedResult,
  AmmoReturnedResult,
} from './weapon';
import { createTestWeapon } from '../combat/testing/weapon';
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

const NOW = DEFAULT_TIMESTAMP;
const ONE_MINUTE_AGO = NOW - (60 * 1000);
const ONE_MINUTE_FROM_NOW = NOW + (60 * 1000);

describe('WeaponEntity', () => {
  const meleeWeapon = createTestWeapon();

  const rangedWeapon = createTestWeapon((schema) => ({
    ...schema,
    urn: 'flux:schema:weapon:test-bow',
    name: 'Test Bow',
    ammo: {
      type: 'flux:schema:ammo:test-arrow',
      capacity: 1,
    },
  }));

  const gunWeapon = createTestWeapon((schema) => ({
    ...schema,
    urn: 'flux:schema:weapon:test-rifle',
    name: 'Test Rifle',
    ammo: {
      type: 'flux:schema:ammo:test-bullet',
      capacity: 30,
    },
  }));

  const testArrowSchema = createAmmoSchema((schema: AmmoSchema) => ({
    ...schema,
    urn: 'flux:schema:ammo:test-arrow',
    name: 'Test Arrow',
    baseMass: 60,
    damage: {
      base: '2d6',
      types: {
        [DamageType.KINETIC]: 1.0,
      },
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

  describe('createWeaponEntity', () => {
    it('creates melee weapon without ammo', () => {
      const weapon = createWeaponEntity('flux:item:weapon:sword:1', meleeWeapon);

      expect(weapon.id).toBe('flux:item:weapon:sword:1');
      expect(weapon.schema).toBe('flux:schema:weapon:test');
      expect(weapon.loadedAmmo).toBeUndefined();
    });

    it('creates ranged weapon without ammo', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);

      expect(weapon.id).toBe('flux:item:weapon:bow:1');
      expect(weapon.schema).toBe('flux:schema:weapon:test-bow');
      expect(weapon.loadedAmmo).toBeUndefined();
    });

    it('creates ranged weapon with ammo', () => {
      const ammoState: WeaponAmmoState = {
        type: 'flux:schema:ammo:test-arrow',
        remaining: 1,
      };

      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon, ammoState);

      expect(weapon.loadedAmmo).toEqual(ammoState);
    });

    it('throws error when providing ammo to melee weapon', () => {
      const ammoState: WeaponAmmoState = {
        type: 'flux:schema:ammo:test-arrow',
        remaining: 1,
      };

      expect(() => {
        createWeaponEntity('flux:item:weapon:sword:1', meleeWeapon, ammoState);
      }).toThrow('Weapon schema does not require ammo, but loaded ammo was provided');
    });
  });

  describe('loadWeapon', () => {
    it('loads arrow into bow', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);

      loadWeapon(weapon, rangedWeapon, testArrowSchema);

      expect(weapon.loadedAmmo).toEqual({
        type: 'flux:schema:ammo:test-arrow',
        remaining: 1,
      });
    });

    it('loads bullets into rifle', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);

      loadWeapon(weapon, gunWeapon, testBulletSchema);

      expect(weapon.loadedAmmo).toEqual({
        type: 'flux:schema:ammo:test-bullet',
        remaining: 30,
      });
    });

    it('reloads weapon with different ammo type', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);

      // Load first ammo
      loadWeapon(weapon, rangedWeapon, testArrowSchema);
      expect(weapon.loadedAmmo?.type).toBe('flux:schema:ammo:test-arrow');

      // Reload with same ammo (should reset to full capacity)
      loadWeapon(weapon, rangedWeapon, testArrowSchema);
      expect(weapon.loadedAmmo?.remaining).toBe(1);
    });

    it('throws error for incompatible ammo type', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);

      expect(() => {
        loadWeapon(weapon, rangedWeapon, testBulletSchema);
      }).toThrow('Weapon flux:schema:weapon:test-bow cannot use ammo type flux:schema:ammo:test-bullet');
    });

    it('throws error when loading melee weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:sword:1', meleeWeapon);

      expect(() => {
        loadWeapon(weapon, meleeWeapon, testArrowSchema);
      }).toThrow('Weapon flux:schema:weapon:test cannot use ammo type flux:schema:ammo:test-arrow');
    });
  });

  describe('fireWeapon', () => {
    it('fires loaded bow (default single shot)', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);

      expect(weapon.loadedAmmo?.remaining).toBe(1);

      fireWeapon(weapon);

      expect(weapon.loadedAmmo?.remaining).toBe(0);
    });

    it('fires loaded rifle multiple times', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      expect(weapon.loadedAmmo?.remaining).toBe(30);

      fireWeapon(weapon);
      expect(weapon.loadedAmmo?.remaining).toBe(29);

      fireWeapon(weapon);
      expect(weapon.loadedAmmo?.remaining).toBe(28);
    });

    it('fires multiple rounds at once (burst fire)', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      expect(weapon.loadedAmmo?.remaining).toBe(30);

      fireWeapon(weapon, 3); // 3-round burst

      expect(weapon.loadedAmmo?.remaining).toBe(27);
    });

    it('fires all remaining ammo', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      fireWeapon(weapon, 30); // Empty the magazine

      expect(weapon.loadedAmmo?.remaining).toBe(0);
    });

    it('throws error when firing unloaded weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);

      expect(() => {
        fireWeapon(weapon);
      }).toThrow('Cannot fire weapon with no ammo loaded');
    });

    it('throws error when firing empty weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);
      fireWeapon(weapon); // Now empty

      expect(() => {
        fireWeapon(weapon);
      }).toThrow('Cannot fire weapon with no ammo loaded');
    });

    it('throws error for zero ammo count', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      expect(() => {
        fireWeapon(weapon, 0);
      }).toThrow('Ammo count must be positive');
    });

    it('throws error for negative ammo count', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      expect(() => {
        fireWeapon(weapon, -5);
      }).toThrow('Ammo count must be positive');
    });

    it('throws error when trying to fire more ammo than available', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      expect(() => {
        fireWeapon(weapon, 35); // More than the 30 loaded
      }).toThrow('Insufficient ammo: need 35, have 30');
    });

    it('throws error when trying to fire more than remaining ammo', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);
      fireWeapon(weapon, 25); // 5 remaining

      expect(() => {
        fireWeapon(weapon, 10); // More than the 5 remaining
      }).toThrow('Insufficient ammo: need 10, have 5');
    });

    it('fires all remaining ammo with ALL_REMAINING_AMMO constant', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      expect(weapon.loadedAmmo?.remaining).toBe(30);

      fireWeapon(weapon, ALL_REMAINING_AMMO);

      expect(weapon.loadedAmmo?.remaining).toBe(0);
    });

    it('fires all remaining ammo when partially loaded', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);
      fireWeapon(weapon, 20); // 10 remaining

      expect(weapon.loadedAmmo?.remaining).toBe(10);

      fireWeapon(weapon, ALL_REMAINING_AMMO);

      expect(weapon.loadedAmmo?.remaining).toBe(0);
    });

    it('handles ALL_REMAINING_AMMO with single-shot weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);

      expect(weapon.loadedAmmo?.remaining).toBe(1);

      fireWeapon(weapon, ALL_REMAINING_AMMO);

      expect(weapon.loadedAmmo?.remaining).toBe(0);
    });
  });

  describe('isWeaponLoaded', () => {
    it('returns false for unloaded weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);

      expect(isWeaponLoaded(weapon)).toBe(false);
    });

    it('returns true for loaded weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);

      expect(isWeaponLoaded(weapon)).toBe(true);
    });

    it('returns false for empty weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);
      fireWeapon(weapon);

      expect(isWeaponLoaded(weapon)).toBe(false);
    });

    it('returns false for melee weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:sword:1', meleeWeapon);

      expect(isWeaponLoaded(weapon)).toBe(false);
    });
  });

  describe('needsReload', () => {
    it('returns true for unloaded weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);

      expect(needsReload(weapon)).toBe(true);
    });

    it('returns false for loaded weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);

      expect(needsReload(weapon)).toBe(false);
    });

    it('returns true for empty weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);
      fireWeapon(weapon);

      expect(needsReload(weapon)).toBe(true);
    });

    it('returns true for melee weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:sword:1', meleeWeapon);

      expect(needsReload(weapon)).toBe(true);
    });
  });

  describe('unloadWeapon', () => {
    it('unloads fully loaded rifle', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      expect(weapon.loadedAmmo?.remaining).toBe(30);

      const unloadedCount = unloadWeapon(weapon);

      expect(unloadedCount).toBe(30);
      expect(weapon.loadedAmmo).toBeUndefined();
    });

    it('unloads partially used rifle', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);
      fireWeapon(weapon, 12); // Use 12 rounds

      expect(weapon.loadedAmmo?.remaining).toBe(18);

      const unloadedCount = unloadWeapon(weapon);

      expect(unloadedCount).toBe(18);
      expect(weapon.loadedAmmo).toBeUndefined();
    });

    it('unloads single arrow from bow', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);

      expect(weapon.loadedAmmo?.remaining).toBe(1);

      const unloadedCount = unloadWeapon(weapon);

      expect(unloadedCount).toBe(1);
      expect(weapon.loadedAmmo).toBeUndefined();
    });

    it('returns 0 when unloading empty weapon', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);

      const unloadedCount = unloadWeapon(weapon);

      expect(unloadedCount).toBe(0);
      expect(weapon.loadedAmmo).toBeUndefined();
    });

    it('returns 0 when unloading weapon with 0 remaining', () => {
      const weapon = createWeaponEntity('flux:item:weapon:bow:1', rangedWeapon);
      loadWeapon(weapon, rangedWeapon, testArrowSchema);
      fireWeapon(weapon); // Fire the arrow

      expect(weapon.loadedAmmo?.remaining).toBe(0);

      const unloadedCount = unloadWeapon(weapon);

      expect(unloadedCount).toBe(0);
      expect(weapon.loadedAmmo).toBeUndefined();
    });

    it('can reload after unloading', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);
      loadWeapon(weapon, gunWeapon, testBulletSchema);

      const unloadedCount = unloadWeapon(weapon);
      expect(unloadedCount).toBe(30);
      expect(weapon.loadedAmmo).toBeUndefined();

      // Should be able to reload
      loadWeapon(weapon, gunWeapon, testBulletSchema);
      expect(weapon.loadedAmmo?.remaining).toBe(30);
    });

    it('handles multiple unload cycles', () => {
      const weapon = createWeaponEntity('flux:item:weapon:rifle:1', gunWeapon);

      // Load, fire some, unload
      loadWeapon(weapon, gunWeapon, testBulletSchema);
      fireWeapon(weapon, 10);
      let unloaded = unloadWeapon(weapon);
      expect(unloaded).toBe(20);

      // Load again, fire different amount, unload
      loadWeapon(weapon, gunWeapon, testBulletSchema);
      fireWeapon(weapon, 5);
      unloaded = unloadWeapon(weapon);
      expect(unloaded).toBe(25);

      expect(weapon.loadedAmmo).toBeUndefined();
    });
  });
});

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
