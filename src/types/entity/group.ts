import { EntityType, AbstractEntity, SymbolicLink } from './entity';
import { EntityURN, RootNamespace } from '~/types/taxonomy';

/**
 * Known group types in the game
 */
export enum GroupType {
  PARTY = 'party',
  ORGANIZATION = 'org',
}

/**
 * A symbolic link to a group with additional type information
 */
export type GroupSymbolicLink<G extends GroupType> =
  & SymbolicLink<EntityType.GROUP>
  & {
    /**
     * The specific type of group
     */
    readonly kind: G;
  };

/**
 * Base type for all groups in our game world.
 * This is an abstract type that should not be used directly.
 * Instead, use one of the concrete group types in the Group union.
 */
export type AbstractGroup<
  T extends EntityType = EntityType,
  G extends GroupType = GroupType,
  ItemsKey extends string = 'items',
> =
  & AbstractEntity<EntityType.GROUP>
  & { readonly kind: G }
  & { [K in ItemsKey]: Record<EntityURN<T>, 1> };

/**
 * A Party is a group of Characters that can travel as a single unit through the game world.
 */
export type Party = AbstractGroup<EntityType.ACTOR, GroupType.PARTY, 'members'>;
export type PartyRef = GroupSymbolicLink<GroupType.PARTY>;
export type PartyURN = `${RootNamespace}:${EntityType.GROUP}:${GroupType.PARTY}:${string}`;

/**
 * An Organization is a group of characters that are part of a larger entity.
 * - Company or corporation
 * - Government or political entity
 * - Guild or faction
 */
export type Organization = AbstractGroup<EntityType.ACTOR, GroupType.ORGANIZATION, 'members'>;
export type OrganizationRef = GroupSymbolicLink<GroupType.ORGANIZATION>;
export type OrganizationURN = `${RootNamespace}:${EntityType.GROUP}:${GroupType.ORGANIZATION}:${string}`;

/**
 * Union of all concrete group types.
 * Use this type when working with groups in a generic way.
 */
export type Group = Party | Organization;

/**
 * Input type for creating a new Party, containing only the required fields
 * that need to be provided when creating a Party.
 */
export type PartyInput = Omit<Party, keyof AbstractEntity<EntityType.GROUP>> & {
  kind: GroupType.PARTY;
};

export type OrganizationInput = Omit<Organization, keyof AbstractEntity<EntityType.GROUP>> & {
  kind: GroupType.ORGANIZATION;
};

export type GroupInput = PartyInput | OrganizationInput;
