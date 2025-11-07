import { GroupType, Party } from '~/types/entity/group';
import { ActorURN, PartyURN } from '~/types/taxonomy';
import { createGroupApi, DEFAULT_GROUP_API_DEPS, DEFAULT_GROUP_POLICY, GroupApiContext, GroupApiDependencies, GroupPolicy } from '~/worldkit/entity/group/api/api';
import { Transform } from '~/worldkit/entity/group/factory';

/**
 * There is a point past which a party goes from an intimate group of humans, to a sprawling mass
 * of strangers -- each mechanically reduced to a certain role. That's not what we want.
 */
export const DEFAULT_MAX_PARTY_SIZE = 3;

export type PartyRemovalResult = {
  wasPartyDisbanded: boolean;
  newOwner?: ActorURN; // Set if ownership was transferred
};

export type PartyApi = {
  createParty: (owner: ActorURN, transform?: Transform<Party>) => Party;
  getParty: (partyId: PartyURN) => Party;
  isPartyMember: (party: Party, memberId: ActorURN) => boolean;
  addPartyMember: (party: Party, memberId: ActorURN) => void;
  removePartyMember: (party: Party, memberId: ActorURN, result?: PartyRemovalResult) => PartyRemovalResult;
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
    disbandGroup,
  } = createGroupApi<GroupType.PARTY>(GroupType.PARTY, context, policy, deps);

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

  const removePartyMember = (
    party: Party,
    memberId: ActorURN,
    result: PartyRemovalResult = { wasPartyDisbanded: false, newOwner: undefined },
  ): PartyRemovalResult => {
    result.newOwner = undefined;
    result.wasPartyDisbanded = false;

    const actor = context.world.actors[memberId];
    if (!actor) {
      throw new Error(`Actor ${memberId} not found`);
    }
    if (actor.party !== party.id) {
      throw new Error(`Actor ${memberId} is not in party ${party.id}`);
    }

    let newOwner: ActorURN | undefined;

    // Check if this is the last member (auto-disband case)
    if (party.size === 1) {
      // Last member leaving - disband the party using the generic group API
      disbandGroup(party, (memberId) => {
        const memberActor = context.world.actors[memberId];
        if (memberActor) {
          memberActor.party = undefined;
        }
      });

      result.wasPartyDisbanded = true;
      return result;
    }

    // Check if ownership transfer is needed (owner leaving with members remaining)
    const isOwnerLeaving = party.owner === memberId;
    if (isOwnerLeaving) {
      // Find the longest-standing member to transfer ownership to
      for (const candidateId in party.members) {
        if (candidateId !== memberId) {
          newOwner = candidateId as ActorURN;
          break; // For now, just take the first non-leaving member
        }
      }

      if (newOwner) {
        // Transfer ownership before removing the member
        party.owner = newOwner;
      }
    }

    // Remove the member using the generic group API
    removeGroupMember(party, memberId);
    actor.party = undefined;

    // Refresh the party after removal
    refreshGroup(party);

    result.newOwner = newOwner;

    return result;
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

  const createParty = (owner: ActorURN, transform?: Transform<Party>): Party => {
    const group = createGroup(owner, transform);
    context.world.actors[owner].party = group.id;
    return group;
  };

  return {
    createParty,
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
