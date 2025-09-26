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
import { WeaponItemURN, ItemURN, SchemaURN } from '~/types/taxonomy';
import { HUMAN_ANATOMY } from '~/types/taxonomy/anatomy';
import { WeaponSchema } from '~/types/schema/weapon';
import { SchemaManager } from '~/worldkit/schema/manager';
import { MassApi } from '~/worldkit/physics/mass';

const DEFAULT_TIMESTAMP = 1234567890000;

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
        [HUMAN_ANATOMY.RIGHT_HAND]: 1,
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
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;

      equipmentApi.equipWeapon(actor, weaponId);

      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]).toBeDefined();
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBe(1);
      expect(mockSchemaManager.getSchemaOrFail).toHaveBeenCalledWith('flux:schema:weapon:sword');
    });

    it('should unequip weapon from anatomical location', () => {
      // Add and equip weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equipWeapon(actor, weaponId);

      // Verify it's equipped
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBe(1);

      // Unequip
      equipmentApi.unequipWeapon(actor, weaponId);

      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBeUndefined();
    });

    it('should get equipped weapon from default locations', () => {
      // Add and equip weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equipWeapon(actor, weaponId);

      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);

      expect(equippedWeapon).toBe(weaponId);
    });

    it('should get equipped weapon from specific locations', () => {
      // Add and equip weapon to right hand
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equipWeapon(actor, weaponId);

      // Should find weapon when searching right hand
      const foundInRightHand = equipmentApi.getEquippedWeapon(actor, [HUMAN_ANATOMY.RIGHT_HAND]);
      expect(foundInRightHand).toBe(weaponId);

      // Should not find weapon when searching only left hand
      const foundInLeftHand = equipmentApi.getEquippedWeapon(actor, [HUMAN_ANATOMY.LEFT_HAND]);
      expect(foundInLeftHand).toBeNull();
    });

    it('should return null when no weapon is equipped', () => {
      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);

      expect(equippedWeapon).toBeNull();
    });

    it('should ensure equipment is initialized', () => {
      actor.equipment = undefined as any;

      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equipWeapon(actor, weaponId);

      expect(actor.equipment).toBeDefined();
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBe(1);
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
          [HUMAN_ANATOMY.RIGHT_HAND]: 1,
          [HUMAN_ANATOMY.LEFT_HAND]: 1,
        },
      } as unknown as WeaponSchema;

      mockSchemaManager.getSchemaOrFail.mockReturnValue(mockWeaponSchema);
    });

    it('should equip weapon to multiple anatomical locations', () => {
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:greatsword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;

      equipmentApi.equipWeapon(actor, weaponId);

      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBe(1);
      expect(actor.equipment[HUMAN_ANATOMY.LEFT_HAND]![weaponId]).toBe(1);
    });

    it('should unequip weapon from all anatomical locations', () => {
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:greatsword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equipWeapon(actor, weaponId);

      // Verify it's equipped in both hands
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBe(1);
      expect(actor.equipment[HUMAN_ANATOMY.LEFT_HAND]![weaponId]).toBe(1);

      equipmentApi.unequipWeapon(actor, weaponId);

      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBeUndefined();
      expect(actor.equipment[HUMAN_ANATOMY.LEFT_HAND]![weaponId]).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when equipping non-existent item', () => {
      const nonExistentId = 'flux:item:non-existent' as WeaponItemURN;

      expect(() => equipmentApi.equipWeapon(actor, nonExistentId))
        .toThrow('Inventory item flux:item:non-existent not found');
    });

    it('should throw error when unequipping non-existent item', () => {
      const nonExistentId = 'flux:item:non-existent' as WeaponItemURN;

      expect(() => equipmentApi.unequipWeapon(actor, nonExistentId))
        .toThrow('Inventory item flux:item:non-existent not found');
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

      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:broken' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;

      // Should not throw, but also should not equip anywhere
      equipmentApi.equipWeapon(actor, weaponId);

      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]).toBeUndefined();
    });

    it('should throw error when trying to equip weapon to occupied slot', () => {
      const weapon1 = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weapon2 = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });

      // Equip first weapon
      equipmentApi.equipWeapon(actor, weapon1.id as WeaponItemURN);

      // Attempting to equip second weapon should throw
      expect(() => equipmentApi.equipWeapon(actor, weapon2.id as WeaponItemURN))
        .toThrow('Equipment slot already occupied');
    });
  });

  describe('dependency injection', () => {
    it('should use default anatomical locations when no dependencies provided', () => {
      // The API should work with default locations
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;

      equipmentApi.equipWeapon(actor, weaponId);
      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);

      expect(equippedWeapon).toBe(weaponId);
    });

    it('should use custom anatomical locations when provided', () => {
      const customLocations = [HUMAN_ANATOMY.LEFT_HAND];
      const customDeps: ActorEquipmentApiDependencies = {
        allowedAnatomicalLocations: customLocations,
      };

      const customEquipmentApi = createActorEquipmentApi(mockSchemaManager as unknown as SchemaManager, inventoryApi, customDeps);

      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      customEquipmentApi.equipWeapon(actor, weaponId);

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
        fit: { [HUMAN_ANATOMY.RIGHT_HAND]: 1 },
      };
      const daggerSchema = {
        id: 'flux:schema:weapon:dagger',
        fit: { [HUMAN_ANATOMY.LEFT_HAND]: 1 },
      };

      mockSchemaManager.getSchemaOrFail
        .mockReturnValueOnce(swordSchema)
        .mockReturnValueOnce(daggerSchema);

      const sword = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const dagger = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:dagger' as SchemaURN });

      equipmentApi.equipWeapon(actor, sword.id as WeaponItemURN);
      equipmentApi.equipWeapon(actor, dagger.id as WeaponItemURN);

      // Should find the first weapon encountered when searching all locations
      const equippedWeapon = equipmentApi.getEquippedWeapon(actor);
      expect([sword.id, dagger.id]).toContain(equippedWeapon);

      // Should find specific weapons in specific locations
      const rightHandWeapon = equipmentApi.getEquippedWeapon(actor, [HUMAN_ANATOMY.RIGHT_HAND]);
      const leftHandWeapon = equipmentApi.getEquippedWeapon(actor, [HUMAN_ANATOMY.LEFT_HAND]);

      expect(rightHandWeapon).toBe(sword.id);
      expect(leftHandWeapon).toBe(dagger.id);
    });

    it('should prevent equipping multiple weapons to the same anatomical location', () => {
      // Add multiple weapons to inventory
      const sword = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const sword2 = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });

      // Equip first weapon
      equipmentApi.equipWeapon(actor, sword.id as WeaponItemURN);
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(sword.id);
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![sword.id as WeaponItemURN]).toBe(1);

      // Attempting to equip second weapon to same slot should throw error
      expect(() => equipmentApi.equipWeapon(actor, sword2.id as WeaponItemURN))
        .toThrow('Equipment slot already occupied');

      // First weapon should still be equipped, second should not be
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![sword.id as WeaponItemURN]).toBe(1);
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![sword2.id as WeaponItemURN]).toBeUndefined();
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(sword.id);

      // After unequipping first weapon, second weapon can be equipped
      equipmentApi.unequipWeapon(actor, sword.id as WeaponItemURN);
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![sword.id as WeaponItemURN]).toBeUndefined();
      expect(equipmentApi.getEquippedWeapon(actor)).toBeNull();

      // Now second weapon can be equipped
      equipmentApi.equipWeapon(actor, sword2.id as WeaponItemURN);
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![sword2.id as WeaponItemURN]).toBe(1);
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(sword2.id);
    });

    it('should cleanup equipment by removing undefined entries and empty objects', () => {
      // Add and equip weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equipWeapon(actor, weaponId);

      // Verify weapon is equipped
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBe(1);
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(weaponId);

      // Manually create undefined entries (simulating corrupted state)
      actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId] = undefined as any;
      actor.equipment[HUMAN_ANATOMY.LEFT_HAND] = {
        ['flux:item:weapon:undefined-weapon' as WeaponItemURN]: undefined as any,
      };

      // Before cleanup: undefined entries and empty objects exist
      expect(weaponId in actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]!).toBe(true); // Key exists
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![weaponId]).toBeUndefined(); // But value is undefined
      expect(HUMAN_ANATOMY.LEFT_HAND in actor.equipment).toBe(true); // Location exists
      expect(equipmentApi.getEquippedWeapon(actor)).toBeNull(); // No equipped weapons found

      // Cleanup equipment
      equipmentApi.cleanupEquipment(actor);

      // After cleanup: undefined entries and empty objects are removed
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]).toBeUndefined(); // Entire location removed
      expect(actor.equipment[HUMAN_ANATOMY.LEFT_HAND]).toBeUndefined(); // Entire location removed
      expect(HUMAN_ANATOMY.RIGHT_HAND in actor.equipment).toBe(false); // Location doesn't exist
      expect(HUMAN_ANATOMY.LEFT_HAND in actor.equipment).toBe(false); // Location doesn't exist
    });
  });

  describe('multi-actor support', () => {
    it('should work with multiple actors independently', () => {
      const actor2 = createActor({});

      const sword = inventoryApi.addItem(actor, {
        id: 'flux:item:test-sword' as ItemURN,
        schema: 'flux:schema:weapon:sword' as SchemaURN
      });
      const dagger = inventoryApi.addItem(actor2, {
        id: 'flux:item:test-dagger' as ItemURN,
        schema: 'flux:schema:weapon:dagger' as SchemaURN
      });

      // Mock different schemas for each weapon
      mockSchemaManager.getSchemaOrFail
        .mockReturnValueOnce({ fit: { [HUMAN_ANATOMY.RIGHT_HAND]: 1 } })
        .mockReturnValueOnce({ fit: { [HUMAN_ANATOMY.LEFT_HAND]: 1 } });

      equipmentApi.equipWeapon(actor, sword.id as WeaponItemURN);
      equipmentApi.equipWeapon(actor2, dagger.id as WeaponItemURN);

      expect(equipmentApi.getEquippedWeapon(actor)).toBe(sword.id);
      expect(equipmentApi.getEquippedWeapon(actor2)).toBe(dagger.id);

      // Verify equipment is separate
      expect(actor.equipment[HUMAN_ANATOMY.RIGHT_HAND]![sword.id as WeaponItemURN]).toBe(1);
      expect(actor2.equipment[HUMAN_ANATOMY.LEFT_HAND]![dagger.id as WeaponItemURN]).toBe(1);
      expect(actor.equipment[HUMAN_ANATOMY.LEFT_HAND]).toBeUndefined();
      expect(actor2.equipment[HUMAN_ANATOMY.RIGHT_HAND]).toBeUndefined();
    });
  });

  describe('integration with inventory API', () => {
    it('should work with the same actor inventory reference', () => {
      const originalInventory = actor.inventory;

      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      equipmentApi.equipWeapon(actor, weapon.id as WeaponItemURN);

      expect(actor.inventory).toBe(originalInventory);
      expect(inventoryApi.hasItem(actor, weapon.id)).toBe(true);
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(weapon.id);
    });

    it('should handle equipment operations when inventory changes', () => {
      // Add and equip weapon
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equipWeapon(actor, weaponId);

      expect(equipmentApi.getEquippedWeapon(actor)).toBe(weaponId);

      // Remove weapon from inventory (this would leave equipment in inconsistent state)
      inventoryApi.removeItem(actor, weaponId);

      // Equipment API should still report the weapon as equipped
      // (This is expected behavior - equipment cleanup is a separate concern)
      expect(equipmentApi.getEquippedWeapon(actor)).toBe(weaponId);
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
          schema: 'flux:schema:weapon:sword' as SchemaURN
        });
        weapons.push(weapon.id as WeaponItemURN);
      }

      // Benchmark equipping weapons (equip one at a time, unequipping previous)
      const startEquip = performance.now();
      let previousWeapon: WeaponItemURN | null = null;
      for (const weaponId of weapons) {
        if (previousWeapon) {
          equipmentApi.unequipWeapon(actor, previousWeapon);
        }
        equipmentApi.equipWeapon(actor, weaponId);
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
        equipmentApi.unequipWeapon(actor, previousWeapon);
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
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;
      equipmentApi.equipWeapon(actor, weaponId);

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
      const weapon = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' as SchemaURN });
      const weaponId = weapon.id as WeaponItemURN;

      // Measure performance of equip/unequip cycles
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        equipmentApi.equipWeapon(actor, weaponId);
        equipmentApi.getEquippedWeapon(actor);
        equipmentApi.unequipWeapon(actor, weaponId);
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
});
