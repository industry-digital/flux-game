import { EpochMilliseconds } from '~/types/time';
import { EntityType, AbstractEntity, Nameable } from './entity';
import { ActorURN, GroupURN } from '~/types/taxonomy';

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
> =
  & Omit<AbstractEntity<EntityType.GROUP>, 'id'>
  & { readonly id: GroupURN<G> }
  & Nameable
  & { readonly kind: G }
  & {
    /**
     * The owner of the group
     */
    owner: ActorURN;

    /**
     * The members of the group
     */
    members: Record<ActorURN, EpochMilliseconds>;

    /**
     * The number of members in the group
     */
    size: number;

    /**
     * The invitations to the group
     */
    invitations: Record<ActorURN, EpochMilliseconds>;

    /**
     * The moment the group was created
     */
    ts: number;
  };

type Transform<T> = (input: T) => T;

export type AbstractGroupApi<TGroupType extends GroupType> = {
  createGroup: (owner: ActorURN, transform?: Transform<AbstractGroup<TGroupType>>) => AbstractGroup<TGroupType>;
  getGroup: (groupId: GroupURN<TGroupType>) => AbstractGroup<TGroupType>;
  isGroupMember: (group: AbstractGroup<TGroupType>, groupMemberId: ActorURN) => boolean;
  addGroupMember: (group: AbstractGroup<TGroupType>, groupMemberId: ActorURN) => void;
  removeGroupMember: (group: AbstractGroup<TGroupType>, groupMemberId: ActorURN) => void;
  setGroupLeader: (group: AbstractGroup<TGroupType>, groupLeaderId: ActorURN) => void;
  areInSameGroup: (groupA: AbstractGroup<TGroupType>, groupB: AbstractGroup<TGroupType>) => boolean;
  refreshGroup: (group: AbstractGroup<TGroupType>) => void;
  inviteToGroup: (group: AbstractGroup<TGroupType>, inviteeId: ActorURN) => void;
  acceptInvitation: (group: AbstractGroup<TGroupType>, inviteeId: ActorURN) => void;
  rejectInvitation: (group: AbstractGroup<TGroupType>, inviteeId: ActorURN) => void;
  isInvited: (group: AbstractGroup<TGroupType>, inviteeId: ActorURN) => boolean;
  getInvitations: (group: AbstractGroup<TGroupType>) => Record<ActorURN, EpochMilliseconds>;
  cleanupExpiredInvitations: (group: AbstractGroup<TGroupType>) => void;
  disbandGroup: (group: AbstractGroup<TGroupType>, onMemberRemoved?: (memberId: ActorURN) => void) => void;
};

/**
 * A Party is a group of Characters that can travel as a single unit through the game world.
 */
export type Party = AbstractGroup<GroupType.PARTY>;

/**
 * A Faction is a group of characters that share allegiance or ideology.
 * - Political faction
 * - Military organization
 * - Guild or alliance
 */
export type Faction = AbstractGroup<GroupType.FACTION>;

/**
 * Union of all concrete group types.
 * Use this type when working with groups in a generic way.
 */
export type Group = Party | Faction;

export enum ExpirationReason {
  EXPIRED = 'expired',
}

export enum PartyInvitationFailureReason {
  INVITEE_ALREADY_IN_PARTY = 'invitee_already_in_party',
}
