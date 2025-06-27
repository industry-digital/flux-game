import {
  ModifiableBoundedAttribute,
  NormalizedValueBetweenZeroAndOne,
  StatefulBoundedValue,
} from '~/types/entity/attribute';
import { AbstractEntity, EntityType, Nameable } from '~/types/entity/entity';

/**
 * The different types of items that can exist in the game
 */
export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  CONSUMABLE = 'consumable',
  RESOURCE = 'resource',
  AMMO = 'ammo',
  CONTAINER = 'container',
  MODIFICATION = 'mod',
  TOOL = 'tool',
  DEVICE = 'device',
}

/**
 * Common properties for all items
 */
export interface ItemState {

  /**
   * The item's condition, or durability.
   * This is a normalized value between 0 and 1, where 1 is perfect condition and 0 is broken/unusable.
   */
  condition: NormalizedValueBetweenZeroAndOne;
}

/**
 * Mixin for items that can stack (ammo, consumables, resources)
 */
export type StackableMixin = {
  /**
   * Stackable properties
   */
  stack: StatefulBoundedValue;
};

/**
 * Mixin for items with limited usage charges
 */
export type ChargeableMixin = {
  /**
   * The number of charges the item has
   */
  charges: StatefulBoundedValue;
};

/**
 * Mixin for container items that can hold other items
 */
export interface ContainerMixin {
  /**
   * Container properties
   */
  contents: {
    /**
     * Maximum capacity in grams
     */
    capacity: ModifiableBoundedAttribute;

    /**
     * Currently stored items
     */
    items: Record<string, Item>;
  };
}

export type AbstractItem<TItemType extends ItemType> =
& AbstractEntity<EntityType.ITEM>
& Nameable
& {
  /**
   * The item's taxonomic classification
   */
  subtype: TItemType;
};

export type Consumable = AbstractItem<ItemType.CONSUMABLE> & StackableMixin;
export type Resource = AbstractItem<ItemType.RESOURCE> & StackableMixin;
export type Ammo = AbstractItem<ItemType.AMMO> & StackableMixin;
export type Container = AbstractItem<ItemType.CONTAINER> & ContainerMixin;
export type Modification = AbstractItem<ItemType.MODIFICATION> & StackableMixin;
export type Tool = AbstractItem<ItemType.TOOL> & StackableMixin;
export type Device = AbstractItem<ItemType.DEVICE> & ChargeableMixin;
export type Weapon = AbstractItem<ItemType.WEAPON> & StackableMixin;
export type Armor = AbstractItem<ItemType.ARMOR> & StackableMixin;

// Union of all possible item types
export type Item = Consumable | Resource | Ammo | Container | Modification | Tool | Device | Weapon | Armor;
