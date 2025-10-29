import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createActorEquipmentApi,
  ActorEquipmentApiDependencies,
  WEAPON_EQUIPMENT_ANATOMICAL_LOCATIONS,
} from './equipment';
import { createActorInventoryApi, ActorInventoryApiDependencies } from './inventory';
import { createActor } from '.';
import { createTestTransformerContext } from '~/testing';
import { Actor } from '~/types/entity/actor';
import { TransformerContext } from '~/types/handler';
import { WeaponItemURN, ItemURN } from '~/types/taxonomy';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';
import { WeaponSchema } from '~/types/schema/weapon';
import { SchemaManager } from '~/worldkit/schema/manager';
import { MassApi } from '~/worldkit/physics/mass';
import { registerWeapons } from '~/worldkit/combat/testing/schema';
import { createTestWeapon } from '~/worldkit/combat/testing/weapon';
import { DEFAULT_TIMESTAMP } from '~/testing/constants';
import { ErrorCode } from '~/types/error';

describe('createActorEquipmentApi', () => {
  let context: TransformerContext;
  let actor: Actor;
  let inventoryApi: ReturnType<typeof createActorInventoryApi>;
  let equipmentApi: ReturnType<typeof createActorEquipmentApi>;
  let mockWeaponSchema: WeaponSchema;
  let mockSchemaManager: {
    getSchemaOrFail: ReturnType<typeof vi.fn>;
    getSchema: ReturnType<typeof vi.fn>;
  };
  let mockMassApi: MassApi;

  beforeEach(() => {
    context = createTestTransformerContext();
    actor = createActor({});


    mockMassApi = {
      computeInventoryMass: vi.fn().mockReturnValue(0),
    } as unknown as MassApi;

    // Mock the mass computation to avoid schema lookup issues
    mockMassApi.computeInventoryMass = vi.fn().mockReturnValue(0);

    // Create inventory API with mocked dependencies
    const mockCreateItemUrn = vi.fn((schema: string) => {
      return `flux:item:${schema.replace(/:/g, '-')}-${Math.random().toString(36).substr(2, 9)}` as ItemURN;
    });

    const mockInventoryDependencies: ActorInventoryApiDependencies = {
      createInventoryItem: (input, deps) => ({
        id: input.id ?? mockCreateItemUrn(input.schema),
        schema: input.schema,
      }),
      createInventoryItemUrn: mockCreateItemUrn,
      timestamp: () => DEFAULT_TIMESTAMP,
    };

    // Mock weapon schema
    mockWeaponSchema = {
      urn: 'flux:schema:item:weapon:sword' as const,
      name: 'Iron Sword',
      description: 'A basic iron sword',
      kind: 'weapon' as const,
      baseMass: 1500, // 1.5kg in grams
      skill: 'flux:skill:melee:sword' as any,
      attack: { base: 5 },
      damage: { min: 5, max: 10 },
      range: { optimal: 1 },
      timers: { fire: 1000 },
      efficiency: 1.0,
      fit: {
        [HumanAnatomy.RIGHT_HAND]: 1,
      },
    } as unknown as WeaponSchema;

    // Mock schema manager
    mockSchemaManager = {
      getSchemaOrFail: vi.fn().mockReturnValue(mockWeaponSchema),
      getSchema: vi.fn().mockReturnValue(mockWeaponSchema),
    };


    inventoryApi = createActorInventoryApi(mockMassApi, mockInventoryDependencies);
    context.schemaManager = mockSchemaManager as unknown as SchemaManager;

    // Create equipment API
    equipmentApi = createActorEquipmentApi(mockSchemaManager as unknown as SchemaManager, inventoryApi);
  });

  describe('basic operations', () => {
    it('should equip weapon to correct anatomical location', () => {
      // Add weapon to inventory first
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;

      equipmentApi.equip(actor, weaponId);

      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]).toBeDefined();
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBe(1);
      expect(mockSchemaManager.getSchemaOrFail).toHaveBeenCalledWith('flux:schema:weapon:sword');
    });

    it('should unequip weapon from anatomical location', () => {
      // Add and equip weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equip(actor, weaponId);

      // Verify it's equipped
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBe(1);

      // Unequip
      equipmentApi.unequip(actor, weaponId);

      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBeUndefined();
    });

    it('should get equipped weapon from default locations', () => {
      // Add and equip weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equip(actor, weaponId);

      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);

      expect(equippedWeapon).toBe(weaponId);
    });

    it('should get equipped weapon from specific locations', () => {
      // Add and equip weapon to right hand
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equip(actor, weaponId);

      // Should find weapon when searching right hand
      const foundInRightHand = equipmentApi.getEquippedWeapon(actor, [HumanAnatomy.RIGHT_HAND]);
      expect(foundInRightHand).toBe(weaponId);

      // Should not find weapon when searching only left hand
      const foundInLeftHand = equipmentApi.getEquippedWeapon(actor, [HumanAnatomy.LEFT_HAND]);
      expect(foundInLeftHand).toBeNull();
    });

    it('should return null when no weapon is equipped', () => {
      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);

      expect(equippedWeapon).toBeNull();
    });

    it('should ensure equipment is initialized', () => {
      actor.equipment = undefined as any;

      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equip(actor, weaponId);

      expect(actor.equipment).toBeDefined();
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBe(1);
    });
  });

  describe('multi-slot weapons', () => {
    beforeEach(() => {
      // Mock a two-handed weapon
      mockWeaponSchema = {
        urn: 'flux:schema:item:weapon:greatsword' as const,
        name: 'Greatsword',
        description: 'A large two-handed sword',
        kind: 'weapon' as const,
        baseMass: 3000, // 3kg in grams
        skill: 'flux:skill:melee:sword' as any,
        attack: { base: 8 },
        damage: { min: 8, max: 15 },
        range: { optimal: 1 },
        timers: { fire: 1500 },
        efficiency: 1.2,
        fit: {
          [HumanAnatomy.RIGHT_HAND]: 1,
          [HumanAnatomy.LEFT_HAND]: 1,
        },
      } as unknown as WeaponSchema;

      mockSchemaManager.getSchemaOrFail.mockReturnValue(mockWeaponSchema);
    });

    it('should equip weapon to multiple anatomical locations', () => {
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:greatsword' });
      const weaponId = weapon.id as WeaponItemURN;

      equipmentApi.equip(actor, weaponId);

      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBe(1);
      expect(actor.equipment[HumanAnatomy.LEFT_HAND]![weaponId]).toBe(1);
    });

    it('should unequip weapon from all anatomical locations', () => {
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:greatsword' });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equip(actor, weaponId);

      // Verify it's equipped in both hands
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBe(1);
      expect(actor.equipment[HumanAnatomy.LEFT_HAND]![weaponId]).toBe(1);

      equipmentApi.unequip(actor, weaponId);

      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBeUndefined();
      expect(actor.equipment[HumanAnatomy.LEFT_HAND]![weaponId]).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when equipping non-existent item', () => {
      const nonExistentId = 'flux:item:non-existent' as WeaponItemURN;

      expect(() => equipmentApi.equip(actor, nonExistentId))
        .toThrow(ErrorCode.NOT_FOUND);
    });

    it('should throw error when unequipping non-existent item', () => {
      const nonExistentId = 'flux:item:non-existent' as WeaponItemURN;

      expect(() => equipmentApi.unequip(actor, nonExistentId))
        .toThrow(ErrorCode.NOT_FOUND);
    });

    it('should handle schema without fit property', () => {
      const schemaWithoutFit = {
        id: 'flux:schema:weapon:broken',
        name: 'Broken Weapon',
        description: 'A weapon without fit data',
        damage: { min: 1, max: 2 },
        mass: 500,
      };

      mockSchemaManager.getSchemaOrFail.mockReturnValue(schemaWithoutFit);

      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:broken' });
      const weaponId = weapon.id as WeaponItemURN;

      // Should not throw, but also should not equip anywhere
      equipmentApi.equip(actor, weaponId);

      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]).toBeUndefined();
    });

    it('should throw error when trying to equip weapon to occupied slot', () => {
      const weapon1 = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weapon2 = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });

      // Equip first weapon
      equipmentApi.equip(actor, weapon1.id as WeaponItemURN);

      // Attempting to equip second weapon should throw
      expect(() => equipmentApi.equip(actor, weapon2.id as WeaponItemURN))
        .toThrow(ErrorCode.CONFLICT);
    });
  });

  describe('dependency injection', () => {
    it('should use default anatomical locations when no dependencies provided', () => {
      // The API should work with default locations
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;

      equipmentApi.equip(actor, weaponId);
      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);

      expect(equippedWeapon).toBe(weaponId);
    });

    it('should use custom anatomical locations when provided', () => {
      const customLocations = [HumanAnatomy.LEFT_HAND];
      const customDeps: ActorEquipmentApiDependencies = {
        allowedAnatomicalLocations: customLocations,
      };

      const customEquipmentApi = createActorEquipmentApi(mockSchemaManager as unknown as SchemaManager, inventoryApi, customDeps);

      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;
      customEquipmentApi.equip(actor, weaponId);

      // Should find weapon when searching all locations (weapon is equipped to RIGHT_HAND)
      const foundInAll = customEquipmentApi.getEquippedWeapon(actor, WEAPON_EQUIPMENT_ANATOMICAL_LOCATIONS);
      expect(foundInAll).toBe(weaponId);

      // Should not find weapon when searching only custom locations (LEFT_HAND)
      const foundInCustom = customEquipmentApi.getEquippedWeapon(actor);
      expect(foundInCustom).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty equipment slots gracefully', () => {
      // Equipment starts empty
      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);
      expect(equippedWeapon).toBeNull();
    });

    it('should handle multiple weapons in different slots', () => {
      // Mock different weapon schemas
      const swordSchema = {
        id: 'flux:schema:weapon:sword',
        fit: { [HumanAnatomy.RIGHT_HAND]: 1 },
      };
      const daggerSchema = {
        id: 'flux:schema:weapon:dagger',
        fit: { [HumanAnatomy.LEFT_HAND]: 1 },
      };

      mockSchemaManager.getSchemaOrFail
        .mockReturnValueOnce(swordSchema)
        .mockReturnValueOnce(daggerSchema);

      const sword = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const dagger = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:dagger' });

      equipmentApi.equip(actor, sword.id as WeaponItemURN);
      equipmentApi.equip(actor, dagger.id as WeaponItemURN);

      // Should find the first weapon encountered when searching all locations
      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);
      expect([sword.id, dagger.id]).toContain(equippedWeapon);

      // Should find specific weapons in specific locations
      const rightHandWeapon = equipmentApi.getEquippedWeapon(actor, [HumanAnatomy.RIGHT_HAND]);
      const leftHandWeapon = equipmentApi.getEquippedWeapon(actor, [HumanAnatomy.LEFT_HAND]);

      expect(rightHandWeapon).toBe(sword.id);
      expect(leftHandWeapon).toBe(dagger.id);
    });

    it('should prevent equipping multiple weapons to the same anatomical location', () => {
      // Add multiple weapons to inventory
      const sword = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const sword2 = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });

      // Equip first weapon
      equipmentApi.equip(actor, sword.id as WeaponItemURN);
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(sword.id);
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![sword.id as WeaponItemURN]).toBe(1);

      // Attempting to equip second weapon to same slot should throw error
      expect(() => equipmentApi.equip(actor, sword2.id as WeaponItemURN))
        .toThrow(ErrorCode.CONFLICT);

      // First weapon should still be equipped, second should not be
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![sword.id as WeaponItemURN]).toBe(1);
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![sword2.id as WeaponItemURN]).toBeUndefined();
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(sword.id);

      // After unequipping first weapon, second weapon can be equipped
      equipmentApi.unequip(actor, sword.id as WeaponItemURN);
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![sword.id as WeaponItemURN]).toBeUndefined();
      expect(equipmentApi.getEquippedWeapon(actor)).toBeNull();

      // Now second weapon can be equipped
      equipmentApi.equip(actor, sword2.id as WeaponItemURN);
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![sword2.id as WeaponItemURN]).toBe(1);
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(sword2.id);
    });

    it('should cleanup equipment by removing undefined entries and empty objects', () => {
      // Add and equip weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equip(actor, weaponId);

      // Verify weapon is equipped
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBe(1);
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(weaponId);

      // Manually create undefined entries (simulating corrupted state)
      actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId] = undefined as any;
      actor.equipment[HumanAnatomy.LEFT_HAND] = {
        ['flux:item:weapon:undefined-weapon' as WeaponItemURN]: undefined as any,
      };

      // Before cleanup: undefined entries and empty objects exist
      expect(weaponId in actor.equipment[HumanAnatomy.RIGHT_HAND]!).toBe(true); // Key exists
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![weaponId]).toBeUndefined(); // But value is undefined
      expect(HumanAnatomy.LEFT_HAND in actor.equipment).toBe(true); // Location exists
      expect(equipmentApi.getEquippedWeapon(actor)).toBeNull(); // No equipped weapons found

      // Cleanup equipment
      equipmentApi.cleanupEquipment(actor);

      // After cleanup: undefined entries and empty objects are removed
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]).toBeUndefined(); // Entire location removed
      expect(actor.equipment[HumanAnatomy.LEFT_HAND]).toBeUndefined(); // Entire location removed
      expect(HumanAnatomy.RIGHT_HAND in actor.equipment).toBe(false); // Location doesn't exist
      expect(HumanAnatomy.LEFT_HAND in actor.equipment).toBe(false); // Location doesn't exist
    });
  });

  describe('multi-actor support', () => {
    it('should work with multiple actors independently', () => {
      const actor2 = createActor({});

      const sword = inventoryApi.addItem(actor, {
        id: 'flux:item:test-sword' as ItemURN,
        schema: 'flux:schema:weapon:sword'
      });
      const dagger = inventoryApi.addItem(actor2, {
        id: 'flux:item:test-dagger' as ItemURN,
        schema: 'flux:schema:weapon:dagger'
      });

      // Mock different schemas for each weapon
      mockSchemaManager.getSchemaOrFail
        .mockReturnValueOnce({ fit: { [HumanAnatomy.RIGHT_HAND]: 1 } })
        .mockReturnValueOnce({ fit: { [HumanAnatomy.LEFT_HAND]: 1 } });

      equipmentApi.equip(actor, sword.id as WeaponItemURN);
      equipmentApi.equip(actor2, dagger.id as WeaponItemURN);

      expect(equipmentApi.getEquippedWeapon(actor)).toBe(sword.id);
      expect(equipmentApi.getEquippedWeapon(actor2)).toBe(dagger.id);

      // Verify equipment is separate
      expect(actor.equipment[HumanAnatomy.RIGHT_HAND]![sword.id as WeaponItemURN]).toBe(1);
      expect(actor2.equipment[HumanAnatomy.LEFT_HAND]![dagger.id as WeaponItemURN]).toBe(1);
      expect(actor.equipment[HumanAnatomy.LEFT_HAND]).toBeUndefined();
      expect(actor2.equipment[HumanAnatomy.RIGHT_HAND]).toBeUndefined();
    });
  });

  describe('integration with inventory API', () => {
    it('should work with the same actor inventory reference', () => {
      const originalInventory = actor.inventory;

      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      equipmentApi.equip(actor, weapon.id as WeaponItemURN);

      expect(actor.inventory).toBe(originalInventory);
      expect(inventoryApi.hasItem(actor, weapon.id)).toBe(true);
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(weapon.id);
    });

    it('should enforce inventory-equipment consistency invariant', () => {
      // Add and equip weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equip(actor, weaponId);

      expect(equipmentApi.getEquippedWeapon(actor)).toBe(weaponId);

      // Remove weapon from inventory (this creates inconsistent state)
      inventoryApi.removeItem(actor, weaponId);

      // Equipment API should throw because the invariant is violated
      // This enforces the invariant: "If an item is equipped, it is in the inventory"
      expect(() => equipmentApi.getEquippedWeapon(actor))
        .toThrow(ErrorCode.NOT_FOUND);
    });
  });

  describe('performance benchmarks', () => {
    it('should handle equipment operations efficiently', () => {
      const weaponCount = 100;

      // Add many weapons to inventory
      const weapons: WeaponItemURN[] = [];
      for (let i = 0; i < weaponCount; i++) {
        const weapon = inventoryApi.addItem(actor, {
          id: `flux:item:perf-sword-${i}` as ItemURN,
          schema: 'flux:schema:weapon:sword'
        });
        weapons.push(weapon.id as WeaponItemURN);
      }

      // Benchmark equipping weapons (equip one at a time, unequipping previous)
      const startEquip = performance.now();
      let previousWeapon: WeaponItemURN | null = null;
      for (const weaponId of weapons) {
        if (previousWeapon) {
          equipmentApi.unequip(actor, previousWeapon);
        }
        equipmentApi.equip(actor, weaponId);
        previousWeapon = weaponId;
      }
      const equipTime = performance.now() - startEquip;

      // Benchmark getting equipped weapon (should be very fast)
      const startGet = performance.now();
      for (let i = 0; i < 1000; i++) {
        equipmentApi.getEquippedWeapon(actor);
      }
      const getTime = performance.now() - startGet;

      // Benchmark unequipping the last weapon (only one is equipped)
      const startUnequip = performance.now();
      if (previousWeapon) {
        equipmentApi.unequip(actor, previousWeapon);
      }
      const unequipTime = performance.now() - startUnequip;

      // Verify operations completed successfully
      expect(equipmentApi.getEquippedWeapon(actor)).toBeNull(); // Last weapon was unequipped

      console.log(`Equipment performance metrics:
        - Equip/unequip ${weaponCount} weapons: ${equipTime.toFixed(2)}ms (${(equipTime/weaponCount).toFixed(4)}ms per weapon)
        - 1000 getEquippedWeapon calls: ${getTime.toFixed(2)}ms (${(getTime/1000).toFixed(4)}ms per call)
        - Final unequip: ${unequipTime.toFixed(2)}ms`);
    });

    it('should demonstrate equipment lookup performance', () => {
      // Equip a weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equip(actor, weaponId);

      // Measure lookup performance with different location sets
      const times: number[] = [];
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        equipmentApi.getEquippedWeapon(actor);
        const time = performance.now() - start;
        times.push(time);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`Equipment lookup performance:
        - Average: ${avgTime.toFixed(4)}ms
        - Min: ${minTime.toFixed(4)}ms
        - Max: ${maxTime.toFixed(4)}ms
        - Operations per second: ${(1000 / avgTime).toFixed(0)}`);

      // Verify lookups are working correctly
      expect(avgTime).toBeGreaterThan(0); // Should have measurable time
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(weaponId); // Weapon should still be equipped
    });

    it('should maintain consistent performance with equipment state changes', () => {
      const iterations = 200;
      const times: number[] = [];

      // Add a weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const weaponId = weapon.id as WeaponItemURN;

      // Measure performance of equip/unequip cycles
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        equipmentApi.equip(actor, weaponId);
        equipmentApi.getEquippedWeapon(actor);
        equipmentApi.unequip(actor, weaponId);
        equipmentApi.getEquippedWeapon(actor); // Should return null

        const time = performance.now() - start;
        times.push(time);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const stdDev = Math.sqrt(times.reduce((sq, time) => sq + Math.pow(time - avgTime, 2), 0) / times.length);

      console.log(`Equipment state change consistency:
        - Average cycle time: ${avgTime.toFixed(4)}ms
        - Min: ${minTime.toFixed(4)}ms
        - Max: ${maxTime.toFixed(4)}ms
        - Std Dev: ${stdDev.toFixed(4)}ms
        - Coefficient of Variation: ${((stdDev / avgTime) * 100).toFixed(1)}%`);

      // Verify final state
      expect(equipmentApi.getEquippedWeapon(actor)).toBeNull();
    });
  });

  describe('real schema manager integration', () => {
    it('should reproduce the schema lookup issue with real SchemaManager', () => {
      // Create a real SchemaManager instead of a mock
      const realSchemaManager = new SchemaManager();

      // Create a test weapon schema
      const testWeapon = createTestWeapon((schema) => ({
        ...schema,
        urn: 'flux:schema:weapon:test-rifle',
        name: 'Test Rifle',
      }));

      // Register the weapon schema using the helper function
      registerWeapons(realSchemaManager, [testWeapon]);
      realSchemaManager.loadAllSchemas(true);

      // Verify schema is registered
      console.log('Real schema manager - available schemas:', Array.from(realSchemaManager.getSchemasOfType('weapon').keys()));

      // Create equipment API with real schema manager
      const realEquipmentApi = createActorEquipmentApi(realSchemaManager, inventoryApi);

      // Add weapon to inventory
      const weaponItem = inventoryApi.addItem(actor, { schema: testWeapon.urn });
      console.log('Added weapon item:', weaponItem);

      // Try to get the schema directly (this should work)
      try {
        const directSchema = realSchemaManager.getSchema(weaponItem.schema as any);
        console.log('Direct schema lookup succeeded:', directSchema.name);
      } catch (error) {
        console.log('Direct schema lookup failed:', (error as Error).message);
      }

      // This should reproduce the issue
      expect(() => realEquipmentApi.equip(actor, weaponItem.id)).not.toThrow();
    });
  });
});
