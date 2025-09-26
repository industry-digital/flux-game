import { Actor } from '~/types/entity/actor';
import { Place } from '~/types/entity/place';
import { RootNamespace } from '~/types/taxonomy';

export type LocallyUniqueId = string;

// Like a UUID
export type UUIDLike = `${string}-${string}-${string}-${string}-${string}`;

export enum EntityType {
  PLACE = 'place',
  ACTOR = 'actor',
  ITEM = 'item',
  GROUP = 'group',
  SESSION = 'session',
}

/**
 * The minimal set of fields that all in-game entities must have.
 */
export type AbstractEntity<T extends EntityType> = {
  /**
   * The canonical URN of the entity
   */
  readonly id: `${RootNamespace}:${T}:${string}`;

  /**
   * The type of entity being referenced
   */
  readonly type: T;
};

export type Nameable = {
  /**
   * Name of the entity
   */
  name: string;
};

/**
 * A mixin type that adds human-friendly name and description fields to an entity.
 */
export type Describable = Nameable & {
  /**
   * Description of the entity
   */
  description: EmergentNarrative;
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

/**
 * An entity is anything that can exist within
 */
export type Entity = Actor | Place;
