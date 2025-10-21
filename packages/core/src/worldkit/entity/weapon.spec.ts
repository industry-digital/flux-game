import { describe, it, expect } from 'vitest';
import {
  WeaponAmmoState,
  createWeaponEntity,
  loadWeapon,
  fireWeapon,
  isWeaponLoaded,
  needsReload,
  unloadWeapon,
  ALL_REMAINING_AMMO,
} from './weapon';
import { createTestWeapon } from '../combat/testing/weapon';
import { AmmoSchema } from '~/types/schema/ammo';
import { createAmmoSchema } from '~/worldkit/schema/ammo/factory';
import { DamageType } from '~/types/damage';

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

      expect(weapon.loadedAmmo!.remaining).toBe(0);
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
