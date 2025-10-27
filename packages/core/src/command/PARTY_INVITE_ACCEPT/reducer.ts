import { Transformer } from '~/types/handler';
import { AcceptPartyInvitationCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withPartyInvitee } from '../party';
import { ErrorCode } from '~/types/error';
import { ActorDidAcceptPartyInvitation, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';

/**
 * Party invite command reducer
 */
export const acceptPartyInvitationReducer: Transformer<AcceptPartyInvitationCommand> = withBasicWorldStateValidation(
  withPartyInvitee(
    (context, command, party) => {
      const invitee = context.world.actors[command.actor];

      // It's not our job to validate command.actor exists
      if (context.partyApi.isPartyMember(party, command.actor)) {
        // Nothing to do
        return context;
      }

      try {
        context.partyApi.acceptInvitation(party, invitee.id);
      } catch (error) {
        // Handle cases like: no pending invitation, already a member, etc.
        context.declareError(ErrorCode.INVALID_TARGET, command.id);
        return context;
      }


      // Emit event that the invitee accepted the invitation
      const didAcceptPartyInvitationEvent: ActorDidAcceptPartyInvitation = createWorldEvent({
        type: EventType.ACTOR_DID_ACCEPT_PARTY_INVITATION,
        trace: command.id,
        location: invitee.location,
        actor: invitee.id,
        payload: {
          partyId: party.id,
          inviterId: party.owner!,
          inviteeId: invitee.id,
        }
      });

      context.declareEvent(didAcceptPartyInvitationEvent);

      return context;
    }
  ),
);
