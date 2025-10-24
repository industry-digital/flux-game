import { AbstractGroup, AbstractGroupApi, Group, GroupType } from '~/types/entity/group';
import { GroupURN, URNLike } from '~/types/taxonomy';
import { EventDeclarationProducer, WorldProjectionConsumer } from '~/types/handler';
import { Transform, GroupFactoryDependencies, DEFAULT_GROUP_FACTORY_DEPS, createGroup } from './factory';

export type GroupApiDependencies<TGroupType extends GroupType> = GroupFactoryDependencies<TGroupType>;

export const DEFAULT_GROUP_API_DEPS: GroupApiDependencies<any> = DEFAULT_GROUP_FACTORY_DEPS;

/**
 * A subset of TransformerContext
 */
export type GroupApiContext = EventDeclarationProducer & WorldProjectionConsumer;

export const createGroupApi = <TGroupType extends GroupType, TGroupMemberKey extends URNLike>(
  groupType: TGroupType,
  context: GroupApiContext,
  deps: GroupFactoryDependencies<TGroupType> = DEFAULT_GROUP_FACTORY_DEPS,
): AbstractGroupApi<TGroupType, TGroupMemberKey> => {

  const createGroupMethod = (transform: Transform<AbstractGroup<TGroupType, TGroupMemberKey>>): AbstractGroup<TGroupType, TGroupMemberKey> => {
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

  return {
    createGroup: createGroupMethod,
    getGroup: getGroup,
    isGroupMember: isGroupMember,
    addGroupMember: addGroupMember,
    removeGroupMember: removeGroupMember,
    setGroupLeader: setGroupLeader,
    areInSameGroup: areInSameGroup,
    refreshGroup: refreshGroup,
  };
};
