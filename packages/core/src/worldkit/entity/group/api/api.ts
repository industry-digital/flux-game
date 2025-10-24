import { AbstractGroup, AbstractGroupApi, Group, GroupType } from '~/types/entity/group';
import { GroupURN, URNLike } from '~/types/taxonomy';
import { EventDeclarationProducer, WorldProjectionConsumer } from '~/types/handler';
import { Transform, GroupFactoryDependencies, DEFAULT_GROUP_FACTORY_DEPS, createGroup } from '../factory';

export type GroupApiDependencies<TGroupType extends GroupType> = GroupFactoryDependencies<TGroupType>;

export const DEFAULT_GROUP_API_DEPS: GroupApiDependencies<any> = DEFAULT_GROUP_FACTORY_DEPS;

/**
 * A subset of TransformerContext
 */
export type GroupApiContext = EventDeclarationProducer & WorldProjectionConsumer;

export type GroupPolicy = {
  invitationTimeout: number;
};

export const DEFAULT_GROUP_POLICY: GroupPolicy = {
  invitationTimeout: 1_000 * 60, // One minute
};

export const createGroupApi = <TGroupType extends GroupType, TGroupMemberKey extends URNLike>(
  groupType: TGroupType,
  context: GroupApiContext,
  policy: GroupPolicy = DEFAULT_GROUP_POLICY,
  deps: GroupFactoryDependencies<TGroupType> = DEFAULT_GROUP_FACTORY_DEPS,
): AbstractGroupApi<TGroupType, TGroupMemberKey> => {

  const createGroupMethod = (transform?: Transform<AbstractGroup<TGroupType, TGroupMemberKey>>): AbstractGroup<TGroupType, TGroupMemberKey> => {
    const group: AbstractGroup<TGroupType, TGroupMemberKey> = createGroup<TGroupType, TGroupMemberKey>(groupType, transform, deps) as AbstractGroup<TGroupType, TGroupMemberKey>;
    context.world.groups[group.id] = group as Group;
    return group;
  };

  const getGroup = (groupId: GroupURN<TGroupType>): AbstractGroup<TGroupType, TGroupMemberKey> => {
    const group = context.world.groups[groupId] as AbstractGroup<TGroupType, TGroupMemberKey> | undefined;
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }
    return group;
  };

  const isGroupMember = (group: AbstractGroup<TGroupType, TGroupMemberKey>, memberId: TGroupMemberKey): boolean => {
    return memberId in group.members;
  };

  const addGroupMember = (group: AbstractGroup<TGroupType, TGroupMemberKey>, memberId: TGroupMemberKey): void => {
    if (memberId in group.members) {
      return; // Already a member
    }
    group.members[memberId] = 1;
    refreshGroup(group);
  };

  const removeGroupMember = (group: AbstractGroup<TGroupType, TGroupMemberKey>, memberId: TGroupMemberKey): void => {
    if (group.owner === memberId) {
      throw new Error(`Cannot remove owner from group ${group.id}`);
    }
    if (!(memberId in group.members)) {
      return; // Not a member
    }

    delete group.members[memberId];
    refreshGroup(group);
  };

  const refreshGroup = (group: AbstractGroup<TGroupType, TGroupMemberKey>): void => {
    // Refresh group size
    group.size = 0;
    for (const _ in group.members) {
      group.size++;
    }

    // Set a default owner if one is not set
    if (!group.owner) {
      for (const memberId in group.members) {
        group.owner = memberId;
        break;
      }
    }
  };

  const setGroupLeader = (group: AbstractGroup<TGroupType, TGroupMemberKey>, memberId: TGroupMemberKey): void => {
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

  const areInSameGroup = (groupA: AbstractGroup<TGroupType, TGroupMemberKey>, groupB: AbstractGroup<TGroupType, TGroupMemberKey>): boolean => {
    return groupA.id === groupB.id;
  };

  const inviteToGroup = (group: AbstractGroup<TGroupType, TGroupMemberKey>, inviteeId: TGroupMemberKey): void => {
    // Can't invite someone who is already a member
    if (isGroupMember(group, inviteeId)) {
      throw new Error(`${inviteeId} is already a member of group ${group.id}`);
    }

    // Refresh the timestamp, even if the invitation already exists
    group.invitations[inviteeId] = deps.timestamp();
  };

  const acceptInvitation = (group: AbstractGroup<TGroupType, TGroupMemberKey>, inviteeId: TGroupMemberKey): void => {
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

  const rejectInvitation = (group: AbstractGroup<TGroupType, TGroupMemberKey>, inviteeId: TGroupMemberKey): void => {
    cleanupExpiredInvitations(group);

    // Must have a pending invitation
    if (!(inviteeId in group.invitations)) {
      throw new Error(`No pending invitation for ${inviteeId} to group ${group.id}`);
    }

    delete group.invitations[inviteeId];
  };

  const isInvitationExpired = (invitationTimestamp: number, now = deps.timestamp()): boolean => {
    return (now - invitationTimestamp) > policy.invitationTimeout;
  };

  const cleanupExpiredInvitations = (group: AbstractGroup<TGroupType, TGroupMemberKey>): void => {
    for (const inviteeId in group.invitations) {
      const timestamp = group.invitations[inviteeId as TGroupMemberKey];
      if (isInvitationExpired(timestamp)) {
        delete group.invitations[inviteeId as TGroupMemberKey];
      }
    }
  };

  const isInvited = (group: AbstractGroup<TGroupType, TGroupMemberKey>, inviteeId: TGroupMemberKey): boolean => {
    cleanupExpiredInvitations(group);
    return inviteeId in group.invitations;
  };

  const getInvitations = (group: AbstractGroup<TGroupType, TGroupMemberKey>): Readonly<Record<TGroupMemberKey, number>> => {
    cleanupExpiredInvitations(group);
    return group.invitations; // Zero-copy
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
  };
};
