import { Entity, EntityType, RootNamespace, Taxonomy, EntityURN } from '~/types';
import {
  ModifiableBoundedAttribute,
  NormalizedValueBetweenZeroAndOne,
  StatefulBoundedValue,
} from '~/types/entity/attribute';

// Base type for all item URNs
export type ItemURN = `${RootNamespace}:item:${string}`;

/**
 * Enumerates meaningful events that can occur to or with an item.
 * These form the backbone of its provenance history.
 */
export enum ItemProvenanceEvent {
  CREATED = 'created',
  CRAFTED = 'crafted',
  LOOTED = 'looted',
  PURCHASED = 'purchased',
  GIFTED = 'gifted',
  TRANSFERRED = 'transferred',
  MODIFIED = 'modified',
  REPAIRED = 'repaired',
  DAMAGED = 'damaged',
  DESTROYED = 'destroyed',
}

/**
 * A historical record of a significant event in the life of an item.
 * Used to establish narrative and technical provenance.
 */
export interface ItemProvenanceEntry {
  event: ItemProvenanceEvent;
  ts: number;
  actor?: EntityURN;
  location?: Taxonomy.Places;
  description?: string;
  txid?: string; // Optional on-chain transaction ID
}

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
 * Base attributes common to all items
 */
export interface ItemAttributesBase {
  /**
   * The item's condition, or durability.
   * This is a normalized value between 0 and 1, where 1 is perfect condition and 0 is broken/unusable.
   */
  condition: NormalizedValueBetweenZeroAndOne;

  /**
   * If the item has a provenance, it means it is soulbound and on-chain.
   */
  provenance?: ItemProvenanceEntry[];
}

/**
 * Generic item attributes with taxonomy type
 */
export interface ItemAttributes<Subtype extends ItemSubtype> extends ItemAttributesBase {
  /**
   * The item's taxonomic classification
   */
  type: Subtype;
}

/**
 * Mixin for items that can stack (ammo, consumables, resources)
 */
export interface StackableMixin {
  /**
   * Stackable properties
   */
  stack: StatefulBoundedValue;
}

/**
 * Mixin for items with limited usage charges
 */
export interface ChargeableMixin {
  /**
   * The number of charges the item has
   */
  charges: StatefulBoundedValue;
}

export type ContainerSkillChecks = {
  [key in Taxonomy.Skills]?: number;
}

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
    items: Record<string, ItemAttributes<any>>;
  };

  /**
   * Skill checks required to interact with the container
   */
  checks: ContainerSkillChecks;
}

/**
 * Complete type for a basic item entity
 */
export type Item<S extends ItemSubtype, A extends ItemAttributes<S>> = Entity<EntityType.ITEM, A>;
