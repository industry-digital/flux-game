import { createTaxonomyUrn } from '~/lib/taxonomy';
import { EntityURN } from '~/types/taxonomy';

export type LocallyUniqueId = string;

// Like a UUID
export type UUIDLike = `${string}-${string}-${string}-${string}-${string}`;

export enum EntityType {
  PLACE = 'place',
  CHARACTER = 'char',
  MONSTER = 'monster',
  ITEM = 'item',
  COLLECTION = 'coll',
}

/**
 * A mixin type that adds human-friendly `name` and `description` fields to an entity.
 */
export type DescribableMixin = {
  /**
   * Human-friendly name of the entity
   */
  name: string;

  /**
   * Human-friendly description of the entity
   */
  description: string | EmergentNarrative;
};

/**
 * A simplified version of ParsedURN used for entity creation/input.
 * This contains just the minimum fields needed to identify an entity,
 * before it's fully processed into a ParsedURN with path and URN string.
 */
export type ParsedURNInput<T extends EntityType = EntityType> = {
  /**
   * The type of entity this URN refers to
   */
  type: T;

  /**
   * The unique identifier part after the type.
   * For example, in "flux:place:world:nightcity", key would be "world:nightcity"
   */
  key: string;
};

/**
 * Runtime representation of an EntityURN, parsed into its constituent parts for efficient access.
 * Example: "flux:place:world:nightcity" becomes { type: "place", key: "world:nightcity", path: ["world", "nightcity"] }
 */
export type ParsedURN<T extends EntityType = EntityType> = ParsedURNInput<T> & {
  /**
   * The key split into its constituent parts.
   * For example, in "flux:place:world:nightcity", path would be ["world", "nightcity"]
   */
  path: string[];

  /**
   * The original URN string, cached for when we need to serialize
   */
  urn: EntityURN<T>;
};

/**
 * The minimal set of fields that all in-game entities must have.
 * This represents the core identity and state tracking of any entity in the game world.
 */
export type BaseEntity<T extends EntityType> = {
  /**
   * The entity's parsed identifier
   */
  id: ParsedURN<T>;

  /**
   * Last modified timestamp in milliseconds since UNIX epoch
   */
  ts: number;

  /**
   * For optimistic locking. This increments whenever we perform a destructive write to the entity.
   */
  version: number;
};

/**
 * Alias for BaseEntity to maintain backward compatibility
 */
export type Entity<T extends EntityType = EntityType> = BaseEntity<T>;

/**
 * Parse an EntityURN into its constituent parts for efficient runtime access
 */
export function parseURN<T extends EntityType>(urn: EntityURN<T>): ParsedURN<T> {
  const [namespace, type, ...parts] = urn.split(':');
  if (namespace !== 'flux' || !type) {
    throw new Error(`Invalid URN format: ${urn}`);
  }
  if (!Object.values(EntityType).includes(type as EntityType)) {
    throw new Error(`Unknown entity type: ${type}`);
  }

  return {
    type: type as T,
    key: parts.join(':'),
    path: parts,
    urn,
  };
}

/**
 * Convert a ParsedURN back to its string URN representation
 */
export function formatURN<T extends EntityType>(parsed: ParsedURN<T>): EntityURN<T> {
  // If we have the original, use it
  if (parsed.urn) return parsed.urn;

  return createTaxonomyUrn(parsed.type, parsed.path);
}

/**
 * An EmergentNarrative is a description of a thing that evolves over time. We use LLMs to generate these.
 */
export type EmergentNarrative = {
  /**
   * The stable base description that provides core information about the entity.
   * This remains constant and prevents drift in the generated content.
   */
  base: string;

  /**
   * The dynamic, AI-generated content that evolves over time.
   * This provides fresh details and reflects changes in the entity's state or surroundings.
   */
  emergent?: string;

  /**
   * Optional metadata about the generation process, for debugging or analysis.
   */
  model?: string;
};
