import { EntityURN, PlaceURN } from '~/types/taxonomy';

// Like a UUID
export type UUIDLike = `${string}-${string}-${string}-${string}-${string}`;

export enum EntityType {
  PLACE = 'place',
  CHARACTER = 'character',
  ITEM = 'item',
  COLLECTION = 'collection',
}

/**
 * An EmergentNarrative is a description of a thing that evolves over time. We use LLMs to generate these.
 */
export interface EmergentNarrative {
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
}

/**
 * A destructured representation of an EntityURN
 */
export interface SymbolicLink<T extends EntityType = EntityType> {
  /**
   * Globally unique identifier
   */
  id: string;
  /**
   * The entity's unique identifier, which is a string representation of the entity's type and ID.
   */
  type: T;
}

/**
 * An Entity is anything that has a representation in the World that the player can interact with. This includes
 * characters, items, places, and collections. It does not include things like rooms, which are represented by Places.
 */
export interface Entity<
  T extends EntityType = EntityType,
  Attributes extends object = {},
> extends Omit<SymbolicLink<T>, 'id'> {
  /**
   * The entity's unique identifier. This is the runtime representation of the entity's ID, and not what we store in the
   * database.
   */
  id: EntityURN<T>;

  /**
   * The entity's type. This is used to determine how the entity should be represented in the world.
   */
  type: T;

  /**
   * The Entity's location in the world
   */
  location?: PlaceURN;

  /**
   * Binds the entity to a specific user account. This is used for user-specific entities, like player characters,
   * or unique items.
   */
  accountId?: UUIDLike;

  /**
   * For hierarchical containment.
   * If the entity is a child of another entity, this a reference to that entity.
   */
  parent?: SymbolicLink;

  /**
   * If this entity is "owned" by another entity, this is the URN of that entity.
   */
  owner?: SymbolicLink;

  /**
   * Human-friendly name of the entity
   */
  name: string;

  /**
   * human-friendly description of the entity
   */
  description: string | EmergentNarrative;

  /**
   * The entity's attributes
   */
  attributes: Attributes;

  /**
   * The moment the entity came into existence, expressed as milliseconds since the UNIX epoch
   */
  createdAt: number;

  /**
   * The moment the entity was last updated, expressed as milliseconds since the UNIX epoch
   */
  updatedAt: number;

  /**
   * For optimistic locking. This increments whenever we perform a destructive write to the entity.
   */
  version: number;
}
