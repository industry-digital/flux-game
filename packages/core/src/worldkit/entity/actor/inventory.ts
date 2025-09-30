import { BASE62_CHARSET, uniqid as uniqidImpl } from '~/lib/random';
import { Actor, Inventory, InventoryItem } from '~/types/entity/actor';
import { PotentiallyImpureOperations } from '~/types/handler';
import { ROOT_NAMESPACE, ItemURN, SchemaURN, ItemType } from '~/types/taxonomy';
import { MassApi } from '~/worldkit/physics/mass';

const ITEM_TYPE_REGEX = /flux:schema:(.*)$/;

export const createInventory = (): Inventory => {
  return {
    mass: 0,
    items: {},
    ts: 0,
  };
};

export type CreateInventoryItemUrnDependencies = {
  uniqid: PotentiallyImpureOperations['uniqid'];
};

export const DEFAULT_CREATE_INVENTORY_ITEM_URN_DEPS: Readonly<CreateInventoryItemUrnDependencies> = {
  uniqid: () => uniqidImpl(8, BASE62_CHARSET),
};

export function createInventoryItemUrn<TItemType extends ItemType>(
  schema: SchemaURN<TItemType>,
  deps: CreateInventoryItemUrnDependencies = DEFAULT_CREATE_INVENTORY_ITEM_URN_DEPS,
) {
  const [, itemType] = schema.match(ITEM_TYPE_REGEX)!;
  return `${ROOT_NAMESPACE}:item:${itemType}:${deps.uniqid()}`;
}

export type InventoryItemDependencies = {
  createInventoryItemUrn: typeof createInventoryItemUrn;
};



export const DEFAULT_INVENTORY_ITEM_DEPENDENCIES: Readonly<InventoryItemDependencies> = {
  createInventoryItemUrn,
};

export type InventoryItemInput<TCategory extends ItemType = ItemType> = {
  id?: ItemURN<TCategory>;
  schema: SchemaURN<TCategory>;
};

export  function createInventoryItem<TCategory extends ItemType = ItemType>(
  input: InventoryItemInput<TCategory>,
  deps: InventoryItemDependencies = DEFAULT_INVENTORY_ITEM_DEPENDENCIES,
): InventoryItem {
  return {
    id: input.id ?? deps.createInventoryItemUrn(input.schema) as ItemURN<TCategory>,
    schema: input.schema,
  };
}

// ============================================================================
// INVENTORY HOOK
// ============================================================================

export type ActorInventoryApi = {
  getItem: (actor: Actor, itemId: ItemURN) => InventoryItem;
  hasItem: (actor: Actor, itemId: ItemURN) => boolean;
  addItem: (actor: Actor, input: InventoryItemInput) => InventoryItem;
  removeItem: (actor: Actor, itemId: ItemURN) => InventoryItem;
  addItems: (actor: Actor, inputs: InventoryItemInput[]) => InventoryItem[];
  removeItems: (actor: Actor, itemIds: ItemURN[]) => InventoryItem[];
  getItemCount: (actor: Actor) => number;
  getTotalMass: (actor: Actor) => number;
  refreshInventory: (actor: Actor) => void;
};

export type ActorInventoryApiDependencies = InventoryItemDependencies & {
  createInventoryItem: typeof createInventoryItem;
  timestamp: PotentiallyImpureOperations['timestamp'];
};

export const DEFAULT_ACTOR_INVENTORY_DEPS: Readonly<ActorInventoryApiDependencies> = {
  ...DEFAULT_INVENTORY_ITEM_DEPENDENCIES,
  createInventoryItem,
  timestamp: () => Date.now(),
};

export function createActorInventoryApi(
  massApi: MassApi,
  deps: ActorInventoryApiDependencies = DEFAULT_ACTOR_INVENTORY_DEPS,
): ActorInventoryApi {
  const {
    createInventoryItem: createInventoryItemImpl = createInventoryItem,
    timestamp: timestampImpl = () => Date.now(),
  } = deps;

  const itemCounts = new Map<Actor, number>();
  const totalMasses = new Map<Actor, number>();

  function getItem(actor: Actor, itemId: ItemURN): InventoryItem {
    const item = actor.inventory.items[itemId];
    if (!item) {
      throw new Error(`Inventory item ${itemId} not found`);
    }
    return item;
  }

  function hasItem(actor: Actor, itemId: ItemURN): boolean {
    return itemId in actor.inventory.items;
  }

  function addItem(actor: Actor, input: InventoryItemInput): InventoryItem {
    if (input.id && input.id in actor.inventory.items) {
      throw new Error(`Inventory item ${input.id} already exists`);
    }
    const item = createInventoryItemImpl(input, deps);
    actor.inventory.items[item.id] = item;

    // Invalidate caches
    itemCounts.delete(actor);
    totalMasses.delete(actor);

    return item;
  }

  function removeItem(actor: Actor, itemId: ItemURN): InventoryItem {
    const item = getItem(actor, itemId);
    delete actor.inventory.items[itemId];

    // Invalidate caches
    itemCounts.delete(actor);
    totalMasses.delete(actor);

    return item;
  }

  function addItems(actor: Actor, inputs: InventoryItemInput[]): InventoryItem[] {
    const output: InventoryItem[] = Array(inputs.length);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const item = addItem(actor, input);
      output[i] = item;
    }

    return output;
  }

  function removeItems(actor: Actor, itemIds: ItemURN[]): InventoryItem[] {
    const output: InventoryItem[] = Array(itemIds.length);

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const item = removeItem(actor, itemId);
      output[i] = item;
    }

    return output;
  }

  function getItemCount(actor: Actor): number {
    let cachedCount = itemCounts.get(actor);
    if (cachedCount === undefined) {
      cachedCount = Object.keys(actor.inventory.items).length;
      itemCounts.set(actor, cachedCount);
    }
    return cachedCount;
  }

  function getTotalMass(actor: Actor): number {
    let cachedMass = totalMasses.get(actor);
    if (cachedMass === undefined) {
      cachedMass = massApi.computeInventoryMass(actor.inventory.items);
      totalMasses.set(actor, cachedMass);
    }
    return cachedMass;
  }

  function refreshInventory(actor: Actor): void {
    // Recompute item count
    // Recompute total mass
    const totalMass = massApi.computeInventoryMass(actor.inventory.items);
    totalMasses.set(actor, totalMass);

    // Update inventory metadata
    actor.inventory.mass = totalMass;
    actor.inventory.ts = timestampImpl();

    // Mark as clean
    itemCounts.set(actor, Object.keys(actor.inventory.items).length);
  }

  return {
    getItem,
    hasItem,
    addItem,
    removeItem,
    addItems,
    removeItems,
    getItemCount,
    getTotalMass,
    refreshInventory,
  };
}
