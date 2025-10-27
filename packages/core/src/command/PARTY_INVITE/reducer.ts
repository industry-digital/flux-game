import { Transformer } from '~/types/handler';
import { PartyInviteCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { createWorldEvent } from '~/worldkit/event';
import { ActorDidCreateParty, ActorDidReceivePartyInvitation, EventType } from '~/types/event';
import { ErrorCode } from '~/types/error';
import { Party } from '~/types/entity/group';

/**
 * Party invite command reducer
 */
export const partyInviteReducer: Transformer<PartyInviteCommand> = withBasicWorldStateValidation(
  (context, command) => {
    const { world } = context;
    const actor = world.actors[command.actor];

    let party: Party | undefined = actor.party ? world.groups[actor.party] as Party : undefined;

    if (!party) {
      // Create the party and add the inviting actor as the first member
      party = context.partyApi.createParty();

      context.partyApi.addPartyMember(party, actor.id);

      const partyCreatedEvent: ActorDidCreateParty = createWorldEvent({
        type: EventType.ACTOR_DID_CREATE_PARTY,
        trace: command.id,
        location: actor.location,
        actor: actor.id,
        payload: {
          partyId: party.id,
        },
      });

      context.declareEvent(partyCreatedEvent);
    }

    const invitee = world.actors[command.args.invitee];
    if (!invitee) {
      context.declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    // Actually send the invitation using the Party API
    try {
      context.partyApi.inviteToParty(party, invitee.id);
    } catch (error) {
      // Handle cases like: already a member, already invited, etc.
      context.declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    // Emit event that the invitee received an invitation
    const didReceivePartyInvitationEvent: ActorDidReceivePartyInvitation = createWorldEvent({
      type: EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION,
      trace: command.id,
      location: command.location!,
      actor: invitee.id, // The invitee is the one receiving the invitation
      payload: {
        partyId: party.id,
        inviterId: party.owner!,
        inviteeId: invitee.id,
      },
    });

    context.declareEvent(didReceivePartyInvitationEvent);

    return context;
  }
);
