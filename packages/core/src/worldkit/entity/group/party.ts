import { GroupType, Party } from '~/types/entity/group';
import { ActorURN, PartyURN } from '~/types/taxonomy';
import { createGroupApi, DEFAULT_GROUP_API_DEPS, DEFAULT_GROUP_POLICY, GroupApiContext, GroupApiDependencies, GroupPolicy } from '~/worldkit/entity/group/api/api';
import { Transform } from '~/worldkit/entity/group/factory';

/**
 * There is a point past which a party goes from an intimate group of humans, to a sprawling mass
 * of strangers -- each mechanically reduced to a certain role. That's not what we want.
 */
export const DEFAULT_MAX_PARTY_SIZE = 3;

type WasPartyDisbanded = boolean;

export type PartyApi = {
  createParty: (transform?: Transform<Party>) => Party;
  getParty: (partyId: PartyURN) => Party;
  isPartyMember: (party: Party, memberId: ActorURN) => boolean;
  addPartyMember: (party: Party, memberId: ActorURN) => void;
  removePartyMember: (party: Party, memberId: ActorURN) => WasPartyDisbanded;
  setPartyLeader: (party: Party, leaderId: ActorURN) => void;
  areInSameParty: (partyA: Party, partyB: Party) => boolean;
  inviteToParty: (party: Party, inviteeId: ActorURN) => void;
  acceptInvitation: (party: Party, inviteeId: ActorURN) => void;
  rejectInvitation: (party: Party, inviteeId: ActorURN) => void;
  isInvited: (party: Party, inviteeId: ActorURN) => boolean;
  getInvitations: (party: Party) => Record<ActorURN, number>;
  cleanupExpiredInvitations: (party: Party) => void;
  refreshParty: (party: Party) => void;
};

export type PartyPolicy = GroupPolicy & {
  maxSize: number;
};

export const DEFAULT_PARTY_POLICY: PartyPolicy = {
  ...DEFAULT_GROUP_POLICY,
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
    inviteToGroup,
    acceptInvitation,
    rejectInvitation,
    isInvited,
    getInvitations,
    cleanupExpiredInvitations,
  } = createGroupApi<GroupType.PARTY, ActorURN>(GroupType.PARTY, context, policy, deps);

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

  const removePartyMember = (party: Party, memberId: ActorURN): boolean => {
    const actor = context.world.actors[memberId];
    if (!actor) {
      throw new Error(`Actor ${memberId} not found`);
    }
    if (actor.party !== party.id) {
      throw new Error(`Actor ${memberId} is not in party ${party.id}`);
    }

    // Remove the member
    removeGroupMember(party, memberId);
    actor.party = undefined;

    // Check if party is now empty and auto-disband if so
    if (party.size === 0) {
      // Remove the party from the world
      delete context.world.groups[party.id];

      return true;
    }

    // Party was *NOT* disbanded; party still has members
    return false;
  };

  const acceptPartyInvitation = (party: Party, inviteeId: ActorURN): void => {
    // Clean up expired invitations first
    cleanupExpiredInvitations(party);

    // Must have a pending invitation
    if (!(inviteeId in party.invitations)) {
      throw new Error(`No pending invitation for ${inviteeId} to group ${party.id}`);
    }

    // Remove invitation and add as party member (which sets actor.party)
    delete party.invitations[inviteeId];
    addPartyMember(party, inviteeId);
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
    inviteToParty: inviteToGroup,
    acceptInvitation: acceptPartyInvitation,
    rejectInvitation: rejectInvitation,
    isInvited: isInvited,
    getInvitations: getInvitations,
    cleanupExpiredInvitations: cleanupExpiredInvitations,
  };
};
