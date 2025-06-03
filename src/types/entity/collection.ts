import { EntityType, BaseEntity } from './entity';
import { EntityURN } from '~/types/taxonomy';

/**
 * Base type for all collections in our game world.
 * This is an abstract type that should not be used directly.
 * Instead, use one of the concrete collection types in the Collection union.
 */
export type AbstractCollection<T extends EntityType = EntityType> = BaseEntity<EntityType.COLLECTION> & {
  /**
   * The items in this collection, keyed by their URN.
   * The URN type is constrained by the collection's type parameter.
   */
  items: Record<EntityURN<T>, 1>;
};

/**
 * A Party is a collection of characters that can act as a group.
 * Examples:
 * - Adventuring party
 * - Raid group
 * - NPC faction members
 */
export type Party = AbstractCollection<EntityType.CHARACTER> & {
  kind: 'party';
};

/**
 * Union of all concrete collection types.
 * Use this type when working with collections in a generic way.
 */
export type Collection = Party;

/**
 * Input type for creating a new Party, containing only the required fields
 * that need to be provided when creating a Party.
 */
export type PartyInput = Omit<Party, keyof BaseEntity<EntityType.COLLECTION>> & {
  kind: 'party';
};
