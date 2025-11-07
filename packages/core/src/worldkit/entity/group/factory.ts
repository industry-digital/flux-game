import { GroupType, AbstractGroup } from '~/types/entity/group';
import { ActorURN, GroupURN } from '~/types/taxonomy';
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

const identity = <T>(x: T): T => x;

export const createGroup = <TGroupType extends GroupType>(
  groupType: TGroupType,
  owner: ActorURN,
  transform: Transform<AbstractGroup<TGroupType>> = identity,
  deps: GroupFactoryDependencies<TGroupType> = DEFAULT_GROUP_FACTORY_DEPS,
): AbstractGroup<TGroupType> => {

  const defaults: AbstractGroup<TGroupType> = {
    id: deps.generateGroupId(groupType),
    ts: deps.timestamp(),
    type: EntityType.GROUP,
    name: '',  //--> Assigned by the owner, if they want to name the group
    kind: groupType,
    owner,
    size: 1, // Owner is automatically a member
    members: {
      [owner]: deps.timestamp(),
    },
    invitations: {},
  };

  return transform(defaults);
};
