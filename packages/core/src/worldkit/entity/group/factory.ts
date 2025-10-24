import { GroupType, AbstractGroup } from '~/types/entity/group';
import { GroupURN, URNLike } from '~/types/taxonomy';
import { BASE36_CHARSET, uniqid } from '~/lib/random';
import { EntityType } from '~/types/entity/entity';

export type Transform<T> = (input: T) => T;

/**
 * Generate a unique group ID
 *
 * We know we'll be creating XMPP MUC Light rooms based on group IDs.
 * Base 36 is safe for XMPP JIDs.
 */
export const generateGroupId = <TGroupType extends GroupType>(
  groupType: TGroupType,
): GroupURN<TGroupType> => {
  return `flux:group:${groupType}:${uniqid(24, BASE36_CHARSET)}`;
};

export type GroupFactoryDependencies<TGroupType extends GroupType> = {
  generateGroupId: (groupType: TGroupType) => GroupURN<TGroupType>;
  timestamp: () => number;
};

export const DEFAULT_GROUP_FACTORY_DEPS: GroupFactoryDependencies<any> = {
  generateGroupId,
  timestamp: () => Date.now(),
};

export const createGroup = <TGroupType extends GroupType, TGroupMemberKey extends URNLike>(
  groupType: TGroupType,
  transform: Transform<AbstractGroup<TGroupType, TGroupMemberKey>>,
  deps: GroupFactoryDependencies<TGroupType> = DEFAULT_GROUP_FACTORY_DEPS,
): AbstractGroup<TGroupType, TGroupMemberKey> => {
  const defaults: AbstractGroup<TGroupType, TGroupMemberKey> = {
    id: deps.generateGroupId(groupType),
    ts: deps.timestamp(),
    type: EntityType.GROUP,
    kind: groupType,
    owner: undefined,
    name: '',
    members: {} as Record<TGroupMemberKey, 1>,
    size: 0,
  };

  return transform(defaults);
};
