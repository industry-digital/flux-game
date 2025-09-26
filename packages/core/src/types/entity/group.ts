import { EntityType, AbstractEntity } from './entity';
import { EntityURN } from '~/types/taxonomy';

/**
 * Known group types in the game
 */
export enum GroupType {
  PARTY = 'party',
  FACTION = 'faction',
}

/**
 * A symbolic link to a group with additional type information
 */
export type GroupSymbolicLink<G extends GroupType> =
  & AbstractEntity<EntityType.GROUP>
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
// PartyURN is now imported from taxonomy

/**
 * A Faction is a group of characters that share allegiance or ideology.
 * - Political faction
 * - Military organization
 * - Guild or alliance
 */
export type Faction = AbstractGroup<EntityType.ACTOR, GroupType.FACTION, 'members'>;
export type FactionRef = GroupSymbolicLink<GroupType.FACTION>;
// FactionURN is now imported from taxonomy

/**
 * Union of all concrete group types.
 * Use this type when working with groups in a generic way.
 */
export type Group = Party | Faction;

/**
 * Input type for creating a new Party, containing only the required fields
 * that need to be provided when creating a Party.
 */
export type PartyInput = Omit<Party, keyof AbstractEntity<EntityType.GROUP>> & {
  kind: GroupType.PARTY;
};

export type FactionInput = Omit<Faction, keyof AbstractEntity<EntityType.GROUP>> & {
  kind: GroupType.FACTION;
};

export type GroupInput = PartyInput | FactionInput;
