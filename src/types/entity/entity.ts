import { Character } from '~/types/entity/character';
import { Place } from '~/types/entity/place';
import { RootNamespace } from '~/types/taxonomy';

export type LocallyUniqueId = string;

// Like a UUID
export type UUIDLike = `${string}-${string}-${string}-${string}-${string}`;

export enum EntityType {
  PLACE = 'place',
  CHARACTER = 'char',
  MONSTER = 'monster',
  ITEM = 'item',
  GROUP = 'group',
}

/**
 * A lightweight reference to an entity, containing just enough information to locate it.
 * Like a symbolic link in a filesystem, this provides a way to reference entities without
 * carrying their full state.
 */
export type SymbolicLink<T extends EntityType> = {

  /**
   * The canonical URN of the entity
   */
  readonly id: `${RootNamespace}:${T}:${string}`;

  /**
   * The type of entity being referenced
   */
  readonly type: T;

  /**
   * The path components that identify the entity
   * This is simply a decomposition of the URN into its components, minus `T` and the namespace.
   */
  readonly path: readonly string[];
};

/**
 * The minimal set of fields that all in-game entities must have.
 */
export type AbstractEntity<T extends EntityType> = SymbolicLink<T>;

/**
 * A mixin type that adds human-friendly name and description fields to an entity.
 */
export type DescribableMixin = {
  /**
   * Name of the entity
   */
  name: string;

  /**
   * Description of the entity
   */
  description: string | EmergentNarrative;
};

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
};

export type Entity = Character | Place;
