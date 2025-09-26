import { NormalizedValueBetweenZeroAndOne, StatefulBoundedValue } from '~/types/entity/attribute';
import { Container } from '~/types/entity/container';
import { Nameable } from '~/types/entity/entity';
import { SchemaURN, ItemType, ItemURN } from '~/types/taxonomy';

/**
 * The different types of items that can exist in the game
 */
export type KindOfItem = ItemType;

/**
 * Common properties for all items
 */
export interface ItemState {
  schema: SchemaURN;

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

export type AbstractItem<TItemType extends ItemType> =
& Nameable
& {
  id: ItemURN<TItemType>;
  schema: SchemaURN<TItemType>;
};

export type Resource = AbstractItem<'resource'> & StackableMixin;
export type Ammo = AbstractItem<'ammo'> & StackableMixin;
export type Modification = AbstractItem<'mod'> & StackableMixin;
export type Device = AbstractItem<'device'> & ChargeableMixin;
export type Weapon = AbstractItem<'weapon'>;
export type Armor = AbstractItem<'armor'> & StackableMixin;

// Union of all possible item entity types
export type Item = Resource | Ammo | Container | Modification | Device | Weapon | Armor;
