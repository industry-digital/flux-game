import { Taxonomy } from '~/types/taxonomy';
import {
  ModifiableBoundedAttribute,
  NormalizedValueBetweenZeroAndOne,
  StatefulBoundedValue,
} from '~/types/entity/attribute';
import { SkillRequirements } from '~/types/requirement';

/**
 * The different types of items that can exist in the game
 */
export enum ItemSubtype {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  CONSUMABLE = 'consumable',
  RESOURCE = 'resource',
  AMMO = 'ammo',
  CONTAINER = 'container',
  MODIFICATION = 'mod',
  TOOL = 'tool',
  DEVICE = 'device',
  VEHICLE = 'vehicle',
}

/**
 * Common properties for all items
 */
export interface ItemState {
  /**
   * The item's taxonomic classification
   */
  subtype: ItemSubtype;

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

export type ContainerSkillChecks = {
  [key in Taxonomy.Skills]?: number;
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
    items: Record<string, any>;
  };

  /**
   * Skill checks required to interact with the container
   */
  checks: SkillRequirements;
}
