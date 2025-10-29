import { BASE62_CHARSET, uniqid as uniqidImpl } from '~/lib/random';
import { Inventory, InventoryItem } from '~/types/entity/actor';
import { ErrorCode } from '~/types/error';
import { PotentiallyImpureOperations } from '~/types/handler';
import { ROOT_NAMESPACE, ItemURN, SchemaURN, ItemType } from '~/types/taxonomy';
import { MassApi } from '~/worldkit/physics/mass';

const ITEM_TYPE_REGEX = /flux:schema:(.*)$/;

export const createInventory = (now: number = Date.now()): Inventory => {
  return {
    mass: 0,
    items: {},
    count: 0,
    ammo: {},
    ts: now,
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
  id?: ItemURN;
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

export type EntityWithInventory = {
  inventory: Inventory;
};

export type ActorInventoryApi = {
  getItem: (entity: EntityWithInventory, itemId: ItemURN) => InventoryItem;
  hasItem: (entity: EntityWithInventory, itemId: ItemURN) => boolean;
  addItem: (entity: EntityWithInventory, input: InventoryItemInput) => InventoryItem;
  removeItem: (entity: EntityWithInventory, itemId: ItemURN) => InventoryItem;
  addItems: (entity: EntityWithInventory, inputs: InventoryItemInput[]) => InventoryItem[];
  removeItems: (entity: EntityWithInventory, itemIds: ItemURN[]) => InventoryItem[];
  getItemCount: (entity: EntityWithInventory) => number;
  getTotalMass: (entity: EntityWithInventory) => number;
  refreshInventory: (entity: EntityWithInventory) => void;
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

  function getItem(entity: EntityWithInventory, itemId: ItemURN): InventoryItem {
    const item = entity.inventory.items[itemId];
    if (!item) {
      throw new Error(ErrorCode.NOT_FOUND);
    }
    return item;
  }

  function hasItem(entity: EntityWithInventory, itemId: ItemURN): boolean {
    return itemId in entity.inventory.items;
  }

  function addItem(entity: EntityWithInventory, input: InventoryItemInput): InventoryItem {
    if (input.id && input.id in entity.inventory.items) {
      throw new Error(`Inventory item ${input.id} already exists`);
    }
    const item = createInventoryItemImpl(input, deps);
    entity.inventory.items[item.id] = item;
    entity.inventory.count += 1;

    return item;
  }

  function removeItem(entity: EntityWithInventory, itemId: ItemURN): InventoryItem {
    const item = getItem(entity, itemId);
    delete entity.inventory.items[itemId];
    entity.inventory.count = Math.max(0, entity.inventory.count - 1);
    return item;
  }

  function addItems(entity: EntityWithInventory, inputs: InventoryItemInput[]): InventoryItem[] {
    const output: InventoryItem[] = Array(inputs.length);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const item = addItem(entity, input);
      output[i] = item;
    }

    return output;
  }

  function removeItems(entity: EntityWithInventory, itemIds: ItemURN[]): InventoryItem[] {
    const output: InventoryItem[] = Array(itemIds.length);

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const item = removeItem(entity, itemId);
      output[i] = item;
    }

    return output;
  }

  function getItemCount(entity: EntityWithInventory): number {
    return entity.inventory.count;
  }

  function getTotalMass(entity: EntityWithInventory): number {
    return massApi.computeInventoryMass(entity.inventory.items);
  }

  function computeItemCount(entity: EntityWithInventory): number {
    let output = 0;
    for (let _ in entity.inventory.items) {
      output++;
    }
    return output;
  }

  function refreshInventory(entity: EntityWithInventory): void {
    // Recompute item count
    // Recompute total mass
    const totalMass = massApi.computeInventoryMass(entity.inventory.items);

    // Update inventory metadata
    entity.inventory.mass = totalMass;
    entity.inventory.count = computeItemCount(entity);
    entity.inventory.ts = timestampImpl();
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
