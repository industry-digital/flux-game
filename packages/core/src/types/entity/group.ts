import { EntityType, AbstractEntity, Nameable } from './entity';
import { ActorURN, GroupURN, URNLike } from '~/types/taxonomy';

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
  G extends GroupType = GroupType,
  TGroupMemberKey extends URNLike = URNLike,
> =
  & Omit<AbstractEntity<EntityType.GROUP>, 'id'>
  & { readonly id: GroupURN<G> }
  & Nameable
  & { readonly kind: G }
  & {
    /**
     * The owner of the group
     */
    owner?: TGroupMemberKey;

    /**
     * The members of the group
     */
    members: Record<TGroupMemberKey, 1>;

    /**
     * The number of members in the group
     */
    size: number;
    /**
     * The moment the group was created
     */
    ts: number;
  };

type Transform<T> = (input: T) => T;

export type AbstractGroupApi<TGroupType extends GroupType, TGroupMemberKey extends URNLike> = {
  createGroup: (transform: Transform<AbstractGroup<TGroupType, TGroupMemberKey>>) => AbstractGroup<TGroupType, TGroupMemberKey>;
  getGroup: (groupId: GroupURN<TGroupType>) => AbstractGroup<TGroupType, TGroupMemberKey>;
  isGroupMember: (group: AbstractGroup<TGroupType, TGroupMemberKey>, groupMemberId: TGroupMemberKey) => boolean;
  addGroupMember: (group: AbstractGroup<TGroupType, TGroupMemberKey>, groupMemberId: TGroupMemberKey) => void;
  removeGroupMember: (group: AbstractGroup<TGroupType, TGroupMemberKey>, groupMemberId: TGroupMemberKey) => void;
  setGroupLeader: (group: AbstractGroup<TGroupType, TGroupMemberKey>, groupLeaderId: TGroupMemberKey) => void;
  areInSameGroup: (groupA: AbstractGroup<TGroupType, TGroupMemberKey>, groupB: AbstractGroup<TGroupType, TGroupMemberKey>) => boolean;
  refreshGroup: (group: AbstractGroup<TGroupType, TGroupMemberKey>) => void;
};

/**
 * A Party is a group of Characters that can travel as a single unit through the game world.
 */
export type Party = AbstractGroup<GroupType.PARTY, ActorURN>;

/**
 * A Faction is a group of characters that share allegiance or ideology.
 * - Political faction
 * - Military organization
 * - Guild or alliance
 */
export type Faction = AbstractGroup<GroupType.FACTION, ActorURN>;

/**
 * Union of all concrete group types.
 * Use this type when working with groups in a generic way.
 */
export type Group = Party | Faction;
