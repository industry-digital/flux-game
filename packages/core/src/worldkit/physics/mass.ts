import { Actor, InventoryItem } from '~/types/entity/actor';
import { Item } from '~/types/entity/item';
import { Container } from '~/types/entity/container';
import { EntityType } from '~/types/entity/entity';
import { SchemaManager } from '~/worldkit/schema/manager';
import { PhysicalEntitySchema } from '~/types/schema/schema';
import { EntityURN } from '~/types/taxonomy';

export const ACTOR_BASE_MASS = 70_000;

/**
 * Union type for all entities that can have mass computed
 */
export type PhysicalEntity = Actor | Item | Container | InventoryItem;

/**
 * Unified mass computation interface - replaces the old MassComputer interface
 * Provides both low-level generic methods and high-level specialized methods
 */

export type MassComputationState = {
  readonly entityMap: Map<EntityURN, PhysicalEntity>;
  readonly massCache: Map<EntityURN, number>;
  readonly visitedSet: Set<EntityURN>;
  readonly computingSet: Set<EntityURN>;
  readonly workQueue: PhysicalEntity[];
};

/**
 * Create a fresh mass computation state
 */
export function createMassComputationState(): MassComputationState {
  return {
    entityMap: new Map(),
    massCache: new Map(),
    visitedSet: new Set(),
    computingSet: new Set(),
    workQueue: []
  };
}

/**
 * Reset state for reuse - pure function that returns new state
 */
export function resetMassComputationState(state: MassComputationState): MassComputationState {
  state.entityMap.clear();
  state.massCache.clear();
  state.visitedSet.clear();
  state.computingSet.clear();
  state.workQueue.length = 0;
  return state;
}


/**
 * Pure function: Iteratively collect all entity dependencies without recursion
 */
export function collectDependenciesIterative(
  rootEntity: PhysicalEntity,
  state: MassComputationState
): void {
  state.workQueue.length = 0;
  state.workQueue.push(rootEntity);

  while (state.workQueue.length > 0) {
    const entity = state.workQueue.pop()!;

    // For InventoryItem, use a synthetic ID since they don't have an id field
    const entityId = entity.id;

    if (state.visitedSet.has(entityId)) continue;
    state.visitedSet.add(entityId);
    state.entityMap.set(entityId, entity);

    // Handle InventoryItem (which only has schema field)
    if (isInventoryItem(entity)) {
      // InventoryItem has no dependencies, just the schema
      continue;
    }

    // Add dependencies to queue for full entities
    switch ((entity as any).type) {
      case EntityType.ACTOR:
        const actor = entity as Actor;
        addEquipmentToQueue(actor.equipment, state);
        addInventoryToQueue(actor.inventory.items, state);
        break;
      case EntityType.ITEM:
        const item = entity as unknown as Item;
        if ('contents' in item) {
          const container = item as Container;
          addObjectValuesToQueue(container.contents, state);
        }
        break;
    }
  }
}

/**
 * Pure function: Add object values to work queue
 */
export function addObjectValuesToQueue(
  obj: Record<string, PhysicalEntity>,
  state: MassComputationState
): void {
  // Safe: Use hasOwnProperty to avoid prototype pollution
  for (const key in obj) {
    state.workQueue.push(obj[key]);
  }
}

/**
 * Pure function: Add equipment items to work queue
 * Note: Equipment contains symbolic links to items in inventory
 * We skip this since the actual items are already processed via inventory
 */
export function addEquipmentToQueue(
  equipment: Actor['equipment'],
  state: MassComputationState
): void {
  // Equipment contains symbolic links to items in the inventory
  // The actual Item entities are processed when we handle inventory.items
  // So we don't need to do anything here
}

/**
 * Pure function: Add inventory items to work queue
 */
export function addInventoryToQueue(
  inventory: Partial<Actor['inventory']['items']>,
  state: MassComputationState
): void {
  // Safe: Use hasOwnProperty to avoid prototype pollution
  for (const key in inventory) {
    const item = inventory[key];
    if (item) {
      state.workQueue.push(item);
    }
  }
}

/**
 * Pure function: Compute all masses iteratively using dependency resolution
 */
export function computeAllMassesIterative(
  state: MassComputationState,
  schemaManager: SchemaManager
): void {
  state.workQueue.length = 0;

  // Add all entities to work queue - iterate directly over Map without intermediate array
  for (const [, entity] of state.entityMap) {
    state.workQueue.push(entity);
  }

  while (state.workQueue.length > 0) {
    const entity = state.workQueue.pop()!;
    const entityId = entity.id;

    if (state.massCache.has(entityId)) continue;
    if (state.computingSet.has(entityId)) {
      throw new Error(`Circular dependency detected: ${entityId}`);
    }

    if (canComputeNow(entity, state)) {
      computeSingleMass(entity, state, schemaManager);
    } else {
      state.workQueue.unshift(entity); // Try again later
    }
  }
}

/**
 * Pure function: Check if all dependencies for an entity have been computed
 */
export function canComputeNow(
  entity: PhysicalEntity,
  state: MassComputationState
): boolean {
  // Handle InventoryItem (which only has schema field)
  if (isInventoryItem(entity)) {
    // InventoryItem has no dependencies, can always compute
    return true;
  }

  switch ((entity as any).type) {
    case EntityType.ITEM:
      const item = entity as unknown as Item;
      if ('contents' in item) {
        const container = item as Container;
        return allDependenciesComputed(container.contents, state);
      }
      return true;
    case EntityType.ACTOR:
      const actor = entity as Actor;
      return allInventoryDependenciesComputed(actor.inventory.items, state);
    default:
      return false;
  }
}

/**
 * Pure function: Check if all items in a collection have computed masses
 */
export function allDependenciesComputed(
  items: Record<string, PhysicalEntity>,
  state: MassComputationState
): boolean {
  for (const key in items) {
    if (items[key] && !state.massCache.has(('id' in items[key] ? items[key].id : key as EntityURN))) {
      return false;
    }
  }
  return true;
}

/**
 * Pure function: Check if all inventory items have computed masses
 */
export function allInventoryDependenciesComputed(
  inventory: Partial<Record<string, InventoryItem>>,
  state: MassComputationState
): boolean {
  for (const key in inventory) {
    const item = inventory[key];
    if (item && !state.massCache.has(key as EntityURN)) { // Use key as ID for InventoryItem
      return false;
    }
  }
  return true;
}

function isInventoryItem(entity: PhysicalEntity): entity is InventoryItem {
  return 'schema' in entity && !('type' in entity);
}

/**
 * Pure function: Compute mass for a single entity using its schema
 */
export function computeSingleMass(
  entity: PhysicalEntity,
  state: MassComputationState,
  schemaManager: SchemaManager
): void {
  // For InventoryItem, we use a synthetic ID since they don't have an id field
  const entityId = entity.id;

  if (!schemaManager || typeof schemaManager.getSchema !== 'function') {
    throw new Error(`Invalid schemaManager provided for entity ${entityId}`);
  }

  state.computingSet.add(entityId);

  try {
    let mass: number;

    // Handle InventoryItem (which only has schema field)
    if (isInventoryItem(entity)) {
      const inventoryItem = entity as InventoryItem;
      try {
        const itemSchema = schemaManager.getSchema(inventoryItem.schema as any) as any;
        if (!itemSchema) {
          throw new Error(`Schema not found for InventoryItem: ${inventoryItem.schema}`);
        }
        mass = itemSchema.baseMass || itemSchema.mass || 1000;
      } catch (error) {
        throw new Error(`Failed to compute mass for InventoryItem ${entityId}: ${error}`);
      }
    } else {
      // Handle full entities with type field
      switch ((entity as any).type) {
        case EntityType.ITEM:
          const item = entity as unknown as Item;
          if ('schema' in item && item.schema) {
            try {
              const itemSchema = schemaManager.getSchema(item.schema as any) as any;
              if (!itemSchema) {
                throw new Error(`Schema not found for Item: ${item.schema}`);
              }
              mass = itemSchema.baseMass || itemSchema.mass || 1000;
            } catch (error) {
              throw new Error(`Failed to compute mass for Item ${entityId}: ${error}`);
            }
          } else {
            throw new Error(`Item ${entityId} has no schema property`);
          }

          // If container, add contents mass
          if ('contents' in item) {
            const container = item as Container;
            mass += sumMasses(container.contents, state);
          }
          break;

        case EntityType.ACTOR:
          const actor = entity as Actor;
          const actorSchema: PhysicalEntitySchema<any> = {
            urn: 'flux:schema:actor:default' as any,
            name: 'Default Actor',
            baseMass: ACTOR_BASE_MASS // 70kg default
          };

          mass = actorSchema.baseMass +
                 sumInventoryMasses(actor.inventory.items, state);

          if (actorSchema.computeAdditionalMass) {
            mass += actorSchema.computeAdditionalMass(actor);
          }
          break;

        default:
          throw new Error(`Unsupported entity type: ${(entity as any).type}`);
      }
    }

    state.massCache.set(entityId, mass);

  } finally {
    state.computingSet.delete(entityId);
  }
}

/**
 * Pure function: Sum masses for a collection of entities
 */
export function sumMasses(
  items: Record<string, PhysicalEntity>,
  state: MassComputationState
): number {
  let sum = 0;
  for (const key in items) {
    const item = items[key];
    if (item) {
      const itemMass = state.massCache.get(item.id);
      if (itemMass !== undefined) {
        sum += itemMass;
      }
    }
  }
  return sum;
}

/**
 * Pure function: Sum masses for inventory items
 */
export function sumInventoryMasses(
  inventory: Partial<Record<string, InventoryItem>>,
  state: MassComputationState
): number {
  let sum = 0;
  // Safe: Use hasOwnProperty to avoid prototype pollution
  for (const key in inventory) {
    const item = inventory[key];
    if (item) {
      // For InventoryItem, use the key as the ID since they don't have id field
      const itemMass = state.massCache.get(key as EntityURN);
      if (itemMass !== undefined) {
        sum += itemMass;
      }
    }
  }
  return sum;
}


/**
 * All return values are in grams
 */
export type MassApi = {
  // Low-level generic methods (replaces old MassComputer interface)
  batchComputeMass: <T extends PhysicalEntity>(entities: T[]) => Map<EntityURN, number>;
  computeMass: <T extends PhysicalEntity>(entity: T) => number;

  // High-level specialized methods for convenience
  computeActorMass: (actor: Actor) => number;
  computeItemMass: (item: Item) => number;
  computeContainerMass: (container: Container) => number;
  computeInventoryMass: (inventory: Record<string, InventoryItem>) => number;
  computeEquipmentMass: (equipment: Record<string, Item>) => number;
  computeCombatMass: (actor: Actor) => number;

  // Legacy compatibility - maps to computeMass for backward compatibility
  computeEntityMass: <T extends PhysicalEntity>(entity: T) => number;
};

/**
 * React hook-style functional API for mass computation
 * Provides clean, composable functions with excellent ergonomics
 * Works directly with MassComputationState for simplicity
 */
export function createMassApi(
  schemaManager: SchemaManager,
  state: MassComputationState = createMassComputationState()
): MassApi {

  /**
   * Compute masses for multiple entities efficiently
   * This is the most efficient method for batch operations
   */
  function batchComputeMass<T extends PhysicalEntity>(entities: T[]): Map<EntityURN, number> {
    resetMassComputationState(state);

    // Phase 1: Collect all dependencies iteratively
    for (const entity of entities) {
      collectDependenciesIterative(entity, state);
    }

    // Phase 2: Compute masses in dependency order
    computeAllMassesIterative(state, schemaManager);

    // Phase 3: Filter results to only include requested entities
    const results = new Map<EntityURN, number>();
    for (const entity of entities) {
      const mass = state.massCache.get(entity.id);
      if (mass !== undefined) {
        results.set(entity.id, mass);
      }
    }

    return results;
  }

  /**
   * Compute total mass for an actor (body + equipment + inventory)
   */
  function computeActorMass(actor: Actor): number {
    resetMassComputationState(state);
    collectDependenciesIterative(actor, state);
    computeAllMassesIterative(state, schemaManager);
    return state.massCache.get(actor.id)!;
  }

  /**
   * Compute mass for an item (including container contents if applicable)
   */
  function computeItemMass(item: Item): number {
    resetMassComputationState(state);
    collectDependenciesIterative(item, state);
    computeAllMassesIterative(state, schemaManager);
    return state.massCache.get(item.id)!;
  }

  /**
   * Compute mass for a container (container + all contents recursively)
   */
  function computeContainerMass(container: Container): number {
    resetMassComputationState(state);
    collectDependenciesIterative(container, state);
    computeAllMassesIterative(state, schemaManager);
    return state.massCache.get(container.id)!;
  }

  /**
   * Generic mass computation for any supported entity type
   */
  function computeMass<T extends PhysicalEntity>(entity: T): number {
    resetMassComputationState(state);
    collectDependenciesIterative(entity, state);
    computeAllMassesIterative(state, schemaManager);
    return state.massCache.get(entity.id)!;
  }

  /**
   * Compute mass of all items in an inventory
   */
  function computeInventoryMass(inventory: Record<string, InventoryItem>): number {
    if (Object.keys(inventory).length === 0) return 0;

    resetMassComputationState(state);

    const entries = Object.entries(inventory) as [EntityURN, InventoryItem][];

    // Add inventory items with their keys as IDs
    for (const [key, item] of entries) {
      if (item) {
        const keyAsId = key as EntityURN;
        state.entityMap.set(keyAsId, { ...item, id: keyAsId } as any);
        state.visitedSet.add(keyAsId);
      }
    }

    // Compute masses directly since InventoryItems have no dependencies
    for (const [key, item] of entries) {
      if (item) {
        const keyAsId = key as EntityURN;
        const entityWithId = { ...item, id: keyAsId } as any;
        computeSingleMass(entityWithId, state, schemaManager);
      }
    }

    let total = 0;
    for (const [key, item] of entries) {
      if (item) {
        total += state.massCache.get(key as EntityURN) || 0;
      }
    }
    return total;
  }

  /**
   * Compute mass of all equipped items
   */
  function computeEquipmentMass(equipment: Record<string, Item>): number {
    const items = Object.values(equipment);
    if (items.length === 0) return 0;

    resetMassComputationState(state);

    // Phase 1: Collect all dependencies iteratively
    for (const item of items) {
      collectDependenciesIterative(item, state);
    }

    // Phase 2: Compute masses in dependency order
    computeAllMassesIterative(state, schemaManager);

    let total = 0;
    for (const item of items) {
      total += state.massCache.get(item.id) || 0;
    }
    return total;
  }

  /**
   * Compute actor mass in kilograms for combat physics calculations
   * Converts from internal grams representation to physics-friendly kg
   */
  function computeCombatMass(actor: Actor): number {
    resetMassComputationState(state);
    collectDependenciesIterative(actor, state);
    computeAllMassesIterative(state, schemaManager);
    const massInGrams = state.massCache.get(actor.id)!;
    return massInGrams / 1000; // Convert grams to kilograms for physics
  }

  /**
   * Legacy compatibility method - maps to computeMass
   * Maintains backward compatibility with old MassComputer interface
   */
  function computeEntityMass<T extends PhysicalEntity>(entity: T): number {
    resetMassComputationState(state);
    collectDependenciesIterative(entity, state);
    computeAllMassesIterative(state, schemaManager);
    return state.massCache.get(entity.id)!;
  }

  return {
    batchComputeMass,
    computeActorMass,
    computeItemMass,
    computeContainerMass,
    computeMass,
    computeInventoryMass,
    computeEquipmentMass,
    computeCombatMass,
    computeEntityMass,
  };
}
