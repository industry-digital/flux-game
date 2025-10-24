import { GroupType, Party } from '~/types/entity/group';
import { ActorURN, PartyURN } from '~/types/taxonomy';
import { createGroupApi, DEFAULT_GROUP_API_DEPS, GroupApiContext, GroupApiDependencies } from '~/worldkit/entity/group/api';
import { Transform } from '~/worldkit/entity/group/factory';

/**
 * There is a point past which a party goes from an intimate group of humans, to a sprawling mass
 * of strangers -- each mechanically reduced to a certain role. That's not what we want.
 */
export const DEFAULT_MAX_PARTY_SIZE = 3;

export type PartyApi = {
  createParty: (transform: Transform<Party>) => Party;
  getParty: (partyId: PartyURN) => Party;
  isPartyMember: (party: Party, memberId: ActorURN) => boolean;
  addPartyMember: (party: Party, memberId: ActorURN) => void;
  removePartyMember: (party: Party, memberId: ActorURN) => void;
  setPartyLeader: (party: Party, leaderId: ActorURN) => void;
  areInSameParty: (partyA: Party, partyB: Party) => boolean;
  refreshParty: (party: Party) => void;
};

export type PartyPolicy = {
  maxSize: number;
};

export const DEFAULT_PARTY_POLICY: PartyPolicy = {
  maxSize: DEFAULT_MAX_PARTY_SIZE,
};

export const createPartyApi = (
  context: GroupApiContext,
  policy: PartyPolicy = DEFAULT_PARTY_POLICY,
  deps: GroupApiDependencies<GroupType.PARTY> = DEFAULT_GROUP_API_DEPS,
): PartyApi => {
  const {
    createGroup,
    getGroup,
    isGroupMember,
    addGroupMember,
    removeGroupMember,
    setGroupLeader,
    areInSameGroup,
    refreshGroup,
  } = createGroupApi<GroupType.PARTY, ActorURN>(GroupType.PARTY, context, deps);

  const addPartyMember = (party: Party, memberId: ActorURN): void => {
    const actor = context.world.actors[memberId];
    if (!actor) {
      throw new Error(`Actor ${memberId} not found`);
    }

    if (actor.party) {
      if (actor.party !== party.id) {
        throw new Error(`Actor ${memberId} is already in a different party (${actor.party})`);
      }
      return;
    }

    if (party.size >= policy.maxSize) {
      throw new Error(`Party ${party.id} is at maximum capacity (${policy.maxSize} members)`);
    }

    addGroupMember(party, memberId);
    actor.party = party.id;
  };

  const removePartyMember = (party: Party, memberId: ActorURN): void => {
    const actor = context.world.actors[memberId];
    if (!actor) {
      throw new Error(`Actor ${memberId} not found`);
    }
    if (actor.party !== party.id) {
      throw new Error(`Actor ${memberId} is not in party ${party.id}`);
    }
    removeGroupMember(party, memberId);
    actor.party = undefined;
  };

  return {
    createParty: createGroup,
    getParty: getGroup,
    isPartyMember: isGroupMember,
    addPartyMember,
    removePartyMember,
    setPartyLeader: setGroupLeader,
    areInSameParty: areInSameGroup,
    refreshParty: refreshGroup,
  };
};
