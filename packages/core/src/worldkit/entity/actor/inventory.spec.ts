import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createActorInventoryApi,
  createInventoryItem,
  InventoryItemInput,
  ActorInventoryApiDependencies,
} from './inventory';
import { createActor } from '.';
import { createTestTransformerContext } from '~/testing';
import { Actor, InventoryItem } from '~/types/entity/actor';
import { TransformerContext } from '~/types/handler';
import { ItemURN } from '~/types/taxonomy';
import { MassApi } from '~/worldkit/physics/mass';

describe('createActorInventoryApi', () => {
  let context: TransformerContext;
  let actor: Actor;
  let inventoryApi: ReturnType<typeof createActorInventoryApi>;
  let mockCreateInventoryItem: ReturnType<typeof vi.fn>;
  let mockCreateItemUrn: ReturnType<typeof vi.fn>;
  let mockDependencies: ActorInventoryApiDependencies;
  let mockMassApi: MassApi;

  beforeEach(() => {
    context = createTestTransformerContext();
    actor = createActor({});

    // Create mock functions
    mockCreateItemUrn = vi.fn((schema: string) => {
      return `flux:item:${schema.replace(/:/g, '-')}-${Math.random().toString(36).substr(2, 9)}` as ItemURN;
    });

    mockCreateInventoryItem = vi.fn((input: InventoryItemInput, deps = mockDependencies) => {
      return createInventoryItem(input, deps);
    });

    // Create mock mass API
    mockMassApi = {
      computeInventoryMass: vi.fn().mockReturnValue(0),
    } as unknown as MassApi;

    // Create mock dependencies
    mockDependencies = {
      createInventoryItemUrn: mockCreateItemUrn,
      createInventoryItem: mockCreateInventoryItem,
      timestamp: () => 1234567890,
    };

    // Create the API instance
    inventoryApi = createActorInventoryApi(mockMassApi, mockDependencies);
  });

  describe('basic operations', () => {
    it('should add item to inventory', () => {
      const input: InventoryItemInput = { schema: 'flux:schema:weapon:sword' };

      const item = inventoryApi.addItem(actor, input);

      expect(item).toBeDefined();
      expect(item.schema).toBe('flux:schema:weapon:sword');
      expect(actor.inventory.items[item.id]).toBe(item);
      expect(mockCreateItemUrn).toHaveBeenCalledWith('flux:schema:weapon:sword');
    });

    it('should get item from inventory', () => {
      const input: InventoryItemInput = { schema: 'flux:schema:weapon:sword' };
      const addedItem = inventoryApi.addItem(actor, input);

      const retrievedItem = inventoryApi.getItem(actor, addedItem.id);

      expect(retrievedItem).toMatchObject({ ...addedItem, id: addedItem.id });
    });

    it('should check if item exists in inventory', () => {
      const input: InventoryItemInput = { schema: 'flux:schema:weapon:sword' };
      const addedItem = inventoryApi.addItem(actor, input);

      expect(inventoryApi.hasItem(actor, addedItem.id)).toBe(true);
      expect(inventoryApi.hasItem(actor, 'non-existent' as ItemURN)).toBe(false);
    });

    it('should remove item from inventory', () => {
      const input: InventoryItemInput = { schema: 'flux:schema:weapon:sword' };
      const addedItem = inventoryApi.addItem(actor, input);

      const removedItem = inventoryApi.removeItem(actor, addedItem.id);

      expect(removedItem).toBe(addedItem);
      expect(actor.inventory.items[addedItem.id]).toBeUndefined();
      expect(inventoryApi.hasItem(actor, addedItem.id)).toBe(false);
    });
  });

  describe('batch operations', () => {
    it('should add multiple item entities', () => {
      const inputs: InventoryItemInput[] = [
        { schema: 'flux:schema:weapon:sword' },
        { schema: 'flux:schema:armor:helmet' },
        { schema: 'flux:schema:ammo:bullet' }
      ];

      const items = inventoryApi.addItems(actor, inputs);

      expect(items).toHaveLength(3);
      expect(items[0].schema).toBe('flux:schema:weapon:sword');
      expect(items[1].schema).toBe('flux:schema:armor:helmet');
      expect(items[2].schema).toBe('flux:schema:ammo:bullet');

      for (const item of items) {
        expect(actor.inventory.items[item.id]).toBe(item);
        expect(inventoryApi.hasItem(actor, item.id)).toBe(true);
      }
    });

    it('should remove multiple items', () => {
      const inputs: InventoryItemInput[] = [
        { schema: 'flux:schema:weapon:sword' },
        { schema: 'flux:schema:armor:helmet' }
      ];
      const addedItems = inventoryApi.addItems(actor, inputs);
      const itemIds = addedItems.map(item => item.id);

      const removedItems = inventoryApi.removeItems(actor, itemIds);

      expect(removedItems).toHaveLength(2);
      expect(removedItems[0]).toBe(addedItems[0]);
      expect(removedItems[1]).toBe(addedItems[1]);

      for (const itemId of itemIds) {
        expect(actor.inventory.items[itemId]).toBeUndefined();
        expect(inventoryApi.hasItem(actor, itemId)).toBe(false);
      }
    });
  });

  describe('item counting', () => {
    it('should return correct item count for empty inventory', () => {
      expect(inventoryApi.getItemCount(actor)).toBe(0);
    });

    it('should return correct item count after adding items', () => {
      inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      expect(inventoryApi.getItemCount(actor)).toBe(1);

      inventoryApi.addItem(actor, { schema: 'flux:schema:armor:helmet' });
      expect(inventoryApi.getItemCount(actor)).toBe(2);
    });

    it('should return correct item count after removing items', () => {
      const item1 = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const item2 = inventoryApi.addItem(actor, { schema: 'flux:schema:armor:helmet' });

      inventoryApi.removeItem(actor, item1.id);
      expect(inventoryApi.getItemCount(actor)).toBe(1);

      inventoryApi.removeItem(actor, item2.id);
      expect(inventoryApi.getItemCount(actor)).toBe(0);
    });

    it('should cache item count computation', () => {
      inventoryApi.addItems(actor, [
        { schema: 'flux:schema:weapon:sword' },
        { schema: 'flux:schema:armor:helmet' }
      ]);

      // First call should compute and cache
      const count1 = inventoryApi.getItemCount(actor);
      // Second call should use cached value
      const count2 = inventoryApi.getItemCount(actor);

      expect(count1).toBe(2);
      expect(count2).toBe(2);
    });

    it('should invalidate cache when items are added or removed', () => {
      expect(inventoryApi.getItemCount(actor)).toBe(0);

      const item = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      expect(inventoryApi.getItemCount(actor)).toBe(1);

      inventoryApi.removeItem(actor, item.id);
      expect(inventoryApi.getItemCount(actor)).toBe(0);
    });
  });

  describe('mass calculations', () => {
    it('should delegate mass calculation to massApi', () => {
      const mockComputeInventoryMass = vi.fn().mockReturnValue(150);
      const mockMassApi = {
        computeInventoryMass: mockComputeInventoryMass,
      } as unknown as MassApi;

      // Create a new API instance with the mock
      const testInventoryApi = createActorInventoryApi(mockMassApi, mockDependencies);

      testInventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });

      const totalMass = testInventoryApi.getTotalMass(actor);

      expect(mockComputeInventoryMass).toHaveBeenCalledWith(actor.inventory.items);
      expect(totalMass).toBe(150);
    });

    it('should cache mass calculations', () => {
      const mockComputeInventoryMass = vi.fn().mockReturnValue(250);
      const mockMassApi = {
        computeInventoryMass: mockComputeInventoryMass,
      } as unknown as MassApi;

      // Create a new API instance with the mock
      const testInventoryApi = createActorInventoryApi(mockMassApi, mockDependencies);

      testInventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });

      // First call should compute and cache
      const mass1 = testInventoryApi.getTotalMass(actor);
      // Second call should use cached value
      const mass2 = testInventoryApi.getTotalMass(actor);

      expect(mass1).toBe(250);
      expect(mass2).toBe(250);
      expect(mockComputeInventoryMass).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should invalidate mass cache when items are added or removed', () => {
      const mockComputeInventoryMass = vi.fn()
        .mockReturnValueOnce(100) // First call (after adding item)
        .mockReturnValueOnce(200); // Second call (after removing item)

      // Update the existing mockMassApi to use our new mock
      mockMassApi.computeInventoryMass = mockComputeInventoryMass;

      const item = inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      const mass1 = inventoryApi.getTotalMass(actor);
      expect(mass1).toBe(100);

      inventoryApi.removeItem(actor, item.id);
      const mass2 = inventoryApi.getTotalMass(actor);
      expect(mass2).toBe(200);

      expect(mockComputeInventoryMass).toHaveBeenCalledTimes(2); // Cache was invalidated
    });

    it('should recompute inventory mass and timestamp on refresh', () => {
      const mockComputeInventoryMass = vi.fn().mockReturnValue(250);

      // Update the existing mockMassApi to use our new mock
      mockMassApi.computeInventoryMass = mockComputeInventoryMass;

      const originalMass = actor.inventory.mass;
      const originalTs = actor.inventory.ts;

      inventoryApi.refreshInventory(actor);

      expect(actor.inventory.mass).toBe(250);
      expect(actor.inventory.ts).toBe(1234567890);
      expect(mockComputeInventoryMass).toHaveBeenCalledWith(actor.inventory.items);
    });
  });

  describe('error handling', () => {
    it('should throw error when getting non-existent item', () => {
      expect(() => inventoryApi.getItem(actor, 'non-existent' as ItemURN))
        .toThrow('Inventory item non-existent not found');
    });

    it('should throw error when removing non-existent item', () => {
      expect(() => inventoryApi.removeItem(actor, 'non-existent' as ItemURN))
        .toThrow('Inventory item non-existent not found');
    });

    it('should throw error when adding item with duplicate ID', () => {
      const itemId = 'duplicate-item' as ItemURN;

      inventoryApi.addItem(actor, { id: itemId, schema: 'flux:schema:weapon:sword' });

      expect(() => inventoryApi.addItem(actor, { id: itemId, schema: 'flux:schema:armor:helmet' }))
        .toThrow('Inventory item duplicate-item already exists');
    });
  });

  describe('dependency injection', () => {
    it('should use default dependencies when none provided', () => {
      const defaultApi = createActorInventoryApi(mockMassApi, mockDependencies);
      const input: InventoryItemInput = {
        id: 'flux:item:weapon:test-sword' as ItemURN,
        schema: 'flux:schema:weapon:sword'
      };

      const item = defaultApi.addItem(actor, input);

      expect(item.schema).toBe('flux:schema:weapon:sword');
      expect(item.id).toBe('flux:item:weapon:test-sword');
    });

    it('should use injected createInventoryItem function', () => {
      const mockItem: InventoryItem = {
        id: 'flux:item:weapon:custom' as ItemURN,
        schema: 'flux:schema:weapon:custom',
      };
      mockCreateInventoryItem.mockReturnValue(mockItem);

      const input: InventoryItemInput = { schema: 'flux:schema:weapon:sword' };

      const item = inventoryApi.addItem(actor, input);

      expect(mockCreateInventoryItem).toHaveBeenCalledWith(input, mockDependencies);
      expect(item).toBe(mockItem);
      expect(actor.inventory.items[mockItem.id]).toBe(mockItem);
    });
  });

  describe('edge cases', () => {
    it('should handle empty batch operations', () => {
      const addedItems = inventoryApi.addItems(actor, []);
      const removedItems = inventoryApi.removeItems(actor, []);

      expect(addedItems).toEqual([]);
      expect(removedItems).toEqual([]);
    });

    it('should handle adding items without explicit IDs', () => {
      const input: InventoryItemInput = { schema: 'flux:schema:weapon:sword' };

      const item = inventoryApi.addItem(actor, input);

      expect(item.id).toBeDefined();
      expect(typeof item.id).toBe('string');
      expect(item.schema).toBe('flux:schema:weapon:sword');
    });

    it('should handle adding items with explicit IDs', () => {
      const itemId = 'flux:item:weapon:explicit-item-id' as ItemURN;
      const input: InventoryItemInput = { id: itemId, schema: 'flux:schema:weapon:sword' };

      const item = inventoryApi.addItem(actor, input);

      expect(item.id).toBe(itemId);
      expect(item.schema).toBe('flux:schema:weapon:sword');
    });

    it('should maintain inventory state consistency across operations', () => {
      // Add some items
      const items = inventoryApi.addItems(actor, [
        { schema: 'flux:schema:weapon:sword' },
        { schema: 'flux:schema:armor:helmet' },
        { schema: 'flux:schema:ammo:bullet' }
      ]);

      expect(inventoryApi.getItemCount(actor)).toBe(3);

      // Remove one item
      inventoryApi.removeItem(actor, items[1].id);
      expect(inventoryApi.getItemCount(actor)).toBe(2);
      expect(inventoryApi.hasItem(actor, items[0].id)).toBe(true);
      expect(inventoryApi.hasItem(actor, items[1].id)).toBe(false);
      expect(inventoryApi.hasItem(actor, items[2].id)).toBe(true);

      // Remove remaining items
      inventoryApi.removeItems(actor, [items[0].id, items[2].id]);
      expect(inventoryApi.getItemCount(actor)).toBe(0);
    });
  });

  describe('multi-actor support', () => {
    it('should work with multiple actors independently', () => {
      const actor2 = createActor({});

      const item1 = inventoryApi.addItem(actor, {
        id: 'flux:item:test-sword' as ItemURN,
        schema: 'flux:schema:weapon:sword'
      });
      const item2 = inventoryApi.addItem(actor2, {
        id: 'flux:item:test-helmet' as ItemURN,
        schema: 'flux:schema:armor:helmet'
      });

      expect(inventoryApi.hasItem(actor, item1.id)).toBe(true);
      expect(inventoryApi.hasItem(actor, item2.id)).toBe(false);
      expect(inventoryApi.hasItem(actor2, item1.id)).toBe(false);
      expect(inventoryApi.hasItem(actor2, item2.id)).toBe(true);
      expect(inventoryApi.getItemCount(actor)).toBe(1);
      expect(inventoryApi.getItemCount(actor2)).toBe(1);
    });

    it('should maintain separate caches for different actors', () => {
      const actor2 = createActor({});
      const mockComputeInventoryMass = vi.fn()
        .mockReturnValueOnce(100) // actor1 mass
        .mockReturnValueOnce(200); // actor2 mass

      // Update the existing mockMassApi to use our new mock
      mockMassApi.computeInventoryMass = mockComputeInventoryMass;

      inventoryApi.addItem(actor, { schema: 'flux:schema:weapon:sword' });
      inventoryApi.addItem(actor2, { schema: 'flux:schema:armor:helmet' });

      const mass1 = inventoryApi.getTotalMass(actor);
      const mass2 = inventoryApi.getTotalMass(actor2);

      expect(mass1).toBe(100);
      expect(mass2).toBe(200);
      expect(mockComputeInventoryMass).toHaveBeenCalledTimes(2);

      // Subsequent calls should use cached values
      const mass1Cached = inventoryApi.getTotalMass(actor);
      const mass2Cached = inventoryApi.getTotalMass(actor2);

      expect(mass1Cached).toBe(100);
      expect(mass2Cached).toBe(200);
      expect(mockComputeInventoryMass).toHaveBeenCalledTimes(2); // No additional calls
    });
  });

  describe('performance benchmarks', () => {
    it('should handle large inventories efficiently', () => {
      const itemCount = 1000;

      // Benchmark adding many items
      const startAdd = performance.now();
      const items: InventoryItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        const item = inventoryApi.addItem(actor, {
          id: `flux:item:ammo:test:${i}` as ItemURN,
          schema: `flux:schema:ammo:test:${i}`
        });
        items.push(item);
      }
      const addTime = performance.now() - startAdd;

      // Benchmark counting items (should use cached value after first call)
      const startCount1 = performance.now();
      const count1 = inventoryApi.getItemCount(actor);
      const countTime1 = performance.now() - startCount1;

      const startCount2 = performance.now();
      const count2 = inventoryApi.getItemCount(actor);
      const countTime2 = performance.now() - startCount2;

      // Benchmark item lookups
      const startLookup = performance.now();
      for (let i = 0; i < 100; i++) {
        const randomIndex = Math.floor(Math.random() * itemCount);
        inventoryApi.hasItem(actor, items[randomIndex].id);
      }
      const lookupTime = performance.now() - startLookup;

      // Benchmark batch removal
      const itemsToRemove = items.slice(0, 500).map(item => item.id);
      const startRemove = performance.now();
      inventoryApi.removeItems(actor, itemsToRemove);
      const removeTime = performance.now() - startRemove;

      // Assertions
      expect(count1).toBe(itemCount);
      expect(count2).toBe(itemCount);
      expect(inventoryApi.getItemCount(actor)).toBe(itemCount - 500);

      console.log(`Performance metrics:
        - Add ${itemCount} items: ${addTime.toFixed(2)}ms
        - Count (first): ${countTime1.toFixed(2)}ms
        - Count (cached): ${countTime2.toFixed(2)}ms
        - 100 lookups: ${lookupTime.toFixed(2)}ms
        - Remove 500 items: ${removeTime.toFixed(2)}ms`);
    });

    it('should demonstrate cache efficiency', () => {
      const mockComputeInventoryMass = vi.fn().mockReturnValue(150);

      // Update the existing mockMassApi to use our new mock
      mockMassApi.computeInventoryMass = mockComputeInventoryMass;

      // Add items to create a non-trivial inventory
      for (let i = 0; i < 100; i++) {
        inventoryApi.addItem(actor, {
          id: `flux:item:weapon:test:${i}` as ItemURN,
          schema: `flux:schema:weapon:test`
        });
      }

      // Measure multiple count calls - should be cached after first
      const countTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        const count = inventoryApi.getItemCount(actor);
        const time = performance.now() - start;
        countTimes.push(time);
        expect(count).toBe(100);
      }

      // Measure multiple mass calls - should be cached after first
      const massTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        const mass = inventoryApi.getTotalMass(actor);
        const time = performance.now() - start;
        massTimes.push(time);
        expect(mass).toBe(150);
      }

      const avgCountTime = countTimes.reduce((a, b) => a + b, 0) / countTimes.length;
      const avgMassTime = massTimes.reduce((a, b) => a + b, 0) / massTimes.length;

      console.log(`Cache efficiency:
        - Avg count time: ${avgCountTime.toFixed(4)}ms
        - Avg mass time: ${avgMassTime.toFixed(4)}ms
        - Mass computations: ${mockComputeInventoryMass.mock.calls.length}`);

      // Mass should only be computed once due to caching
      expect(mockComputeInventoryMass).toHaveBeenCalledTimes(1);
    });

    it('should handle batch operations efficiently', () => {
      const batchSize = 200;

      // Prepare batch input
      const batchInput: InventoryItemInput[] = [];
      for (let i = 0; i < batchSize; i++) {
        batchInput.push({
          id: `flux:item:weapon:batch:${i}` as ItemURN,
          schema: `flux:schema:weapon:batch`
        });
      }

      // Benchmark batch add
      const startBatchAdd = performance.now();
      const addedItems = inventoryApi.addItems(actor, batchInput);
      const batchAddTime = performance.now() - startBatchAdd;

      // Compare with individual adds
      const actor2 = createActor({});
      const startIndividualAdd = performance.now();
      for (const input of batchInput) {
        inventoryApi.addItem(actor2, {
          id: input.id!.replace('batch:', 'individual:') as ItemURN,
          schema: input.schema
        });
      }
      const individualAddTime = performance.now() - startIndividualAdd;

      // Benchmark batch remove
      const itemIds = addedItems.map(item => item.id);
      const startBatchRemove = performance.now();
      const removedItems = inventoryApi.removeItems(actor, itemIds);
      const batchRemoveTime = performance.now() - startBatchRemove;

      expect(addedItems).toHaveLength(batchSize);
      expect(removedItems).toHaveLength(batchSize);
      expect(inventoryApi.getItemCount(actor)).toBe(0);

      console.log(`Batch operation performance:
        - Batch add ${batchSize} items: ${batchAddTime.toFixed(2)}ms
        - Individual add ${batchSize} items: ${individualAddTime.toFixed(2)}ms
        - Batch remove ${batchSize} items: ${batchRemoveTime.toFixed(2)}ms
        - Batch add speedup: ${(individualAddTime / batchAddTime).toFixed(1)}x`);
    });
  });
});
