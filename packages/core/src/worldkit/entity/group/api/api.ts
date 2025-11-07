import { AbstractGroup, AbstractGroupApi, Group, GroupType } from '~/types/entity/group';
import { ActorURN, GroupURN } from '~/types/taxonomy';
import { WorldProjectionConsumer } from '~/types/handler';
import { Transform, GroupFactoryDependencies, DEFAULT_GROUP_FACTORY_DEPS, createGroup } from '../factory';
import { EpochMilliseconds } from '~/types/time';

export type GroupApiDependencies<TGroupType extends GroupType> = GroupFactoryDependencies<TGroupType>;

export const DEFAULT_GROUP_API_DEPS: GroupApiDependencies<any> = DEFAULT_GROUP_FACTORY_DEPS;

/**
 * A subset of TransformerContext
 */
export type GroupApiContext = WorldProjectionConsumer;

export type GroupPolicy = {
  invitationTimeout: number;
};

export const DEFAULT_GROUP_POLICY: GroupPolicy = {
  invitationTimeout: 1_000 * 60, // One minute
};

export type MemberRemovedCallback = (memberId: ActorURN) => void;

export const createGroupApi = <TGroupType extends GroupType>(
  groupType: TGroupType,
  context: GroupApiContext,
  policy: GroupPolicy = DEFAULT_GROUP_POLICY,
  deps: GroupFactoryDependencies<TGroupType> = DEFAULT_GROUP_FACTORY_DEPS,
): AbstractGroupApi<TGroupType> => {
  const { world } = context;

  const createGroupMethod = (owner: ActorURN, transform?: Transform<AbstractGroup<TGroupType>>): AbstractGroup<TGroupType> => {
    const group = createGroup<TGroupType>(
      groupType,
      owner,
      transform,
      deps,
    );

    world.groups[group.id] = group as Group;

    return group;
  };

  const getGroup = (groupId: GroupURN<TGroupType>): AbstractGroup<TGroupType> => {
    const group = context.world.groups[groupId] as AbstractGroup<TGroupType> | undefined;
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }
    return group;
  };

  const isGroupMember = (group: AbstractGroup<TGroupType>, memberId: ActorURN): boolean => {
    return memberId in group.members;
  };

  const addGroupMember = (group: AbstractGroup<TGroupType>, memberId: ActorURN): void => {
    if (memberId in group.members) {
      return; // Already a member
    }
    group.members[memberId] = 1;
    refreshGroup(group);
  };

  const removeGroupMember = (group: AbstractGroup<TGroupType>, memberId: ActorURN): void => {
    if (group.owner === memberId) {
      throw new Error(`Cannot remove owner from group ${group.id}`);
    }
    if (!(memberId in group.members)) {
      return; // Not a member
    }

    delete group.members[memberId];
    refreshGroup(group);
  };

  const refreshGroup = (group: AbstractGroup<TGroupType>): void => {
    // Refresh group size
    group.size = 0;
    for (const _ in group.members) {
      group.size++;
    }

    // Set a default owner if one is not set
    if (!group.owner) {
      for (const memberId in group.members) {
        group.owner = memberId as ActorURN;
        break;
      }
    }
  };

  const setGroupLeader = (group: AbstractGroup<TGroupType>, memberId: ActorURN): void => {
    const inGroup = isGroupMember(group, memberId);
    if (!inGroup) {
      throw new Error(`Member ${memberId} is not a member of group ${group.id}`);
    }
    if (group.owner === memberId) {
      return;
    }
    group.owner = memberId;
    refreshGroup(group);
  };

  const areInSameGroup = (groupA: AbstractGroup<TGroupType>, groupB: AbstractGroup<TGroupType>): boolean => {
    return groupA.id === groupB.id;
  };

  const inviteToGroup = (group: AbstractGroup<TGroupType>, inviteeId: ActorURN): void => {
    // Can't invite someone who is already a member
    if (isGroupMember(group, inviteeId)) {
      throw new Error(`${inviteeId} is already a member of group ${group.id}`);
    }

    // Refresh the timestamp, even if the invitation already exists
    group.invitations[inviteeId] = deps.timestamp();
  };

  const acceptInvitation = (group: AbstractGroup<TGroupType>, inviteeId: ActorURN): void => {
    // Clean up expired invitations first
    cleanupExpiredInvitations(group);

    // Must have a pending invitation
    if (!(inviteeId in group.invitations)) {
      throw new Error(`No pending invitation for ${inviteeId} to group ${group.id}`);
    }

    // Remove invitation and add as member
    delete group.invitations[inviteeId];
    addGroupMember(group, inviteeId);
  };

  const rejectInvitation = (group: AbstractGroup<TGroupType>, inviteeId: ActorURN): void => {
    cleanupExpiredInvitations(group);

    // Must have a pending invitation
    if (!(inviteeId in group.invitations)) {
      throw new Error(`No pending invitation for ${inviteeId} to group ${group.id}`);
    }

    delete group.invitations[inviteeId];
  };

  const isInvitationExpired = (
    invitationTimestamp: EpochMilliseconds,
    now: EpochMilliseconds = deps.timestamp(),
  ): boolean => {
    return (now - invitationTimestamp) > policy.invitationTimeout;
  };

  const cleanupExpiredInvitations = (group: AbstractGroup<TGroupType>): void => {
    for (const inviteeId in group.invitations) {
      const timestamp = group.invitations[inviteeId as ActorURN];
      if (timestamp && isInvitationExpired(timestamp)) {
        delete group.invitations[inviteeId as ActorURN];
      }
    }
  };

  const isInvited = (group: AbstractGroup<TGroupType>, inviteeId: ActorURN): boolean => {
    cleanupExpiredInvitations(group);
    return inviteeId in group.invitations;
  };

  const getInvitations = (group: AbstractGroup<TGroupType>): Readonly<Record<ActorURN, EpochMilliseconds>> => {
    cleanupExpiredInvitations(group);
    return group.invitations; // Zero-copy
  };

  const disbandGroup = (group: AbstractGroup<TGroupType>, onMemberRemoved?: MemberRemovedCallback): void => {
    if (onMemberRemoved) {
      for (const memberId in group.members) {
        onMemberRemoved(memberId as ActorURN);
      }
    }

    // Clear group state
    group.members = {};
    group.invitations = {};
    group.size = 0;

    // @ts-expect-error: We can break the "group must have an owner" invariant in this case because we
    // are disbanding it.
    group.owner = undefined;

    // Remove from world
    delete context.world.groups[group.id];
  };

  return {
    createGroup: createGroupMethod,
    getGroup: getGroup,
    isGroupMember: isGroupMember,
    addGroupMember: addGroupMember,
    removeGroupMember: removeGroupMember,
    setGroupLeader: setGroupLeader,
    areInSameGroup: areInSameGroup,
    refreshGroup: refreshGroup,
    inviteToGroup: inviteToGroup,
    acceptInvitation: acceptInvitation,
    rejectInvitation: rejectInvitation,
    isInvited: isInvited,
    getInvitations: getInvitations,
    cleanupExpiredInvitations: cleanupExpiredInvitations,
    disbandGroup: disbandGroup,
  };
};
