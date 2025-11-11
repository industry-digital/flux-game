import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { RejectPartyInvitationCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withPartyInvitee } from '../party';
import { ErrorCode } from '~/types/error';
import { ActorDidRejectPartyInvitation, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, RejectPartyInvitationCommand> = (context, command, party) => {
  const rejecter = context.world.actors[command.actor];

  try {
    context.partyApi.rejectInvitation(party, command.actor);
  } catch (error) {
    // Handle cases like: no pending invitation, etc.
    context.declareError(ErrorCode.INVALID_TARGET, command.id);
    return context;
  }

  // Emit event that the actor rejected the invitation
  const didRejectPartyInvitationEvent: ActorDidRejectPartyInvitation = createWorldEvent({
    type: EventType.ACTOR_DID_REJECT_PARTY_INVITATION,
    trace: command.id,
    location: rejecter.location,
    actor: rejecter.id,
    payload: {
      partyId: party.id,
      inviterId: party.owner!,
      inviteeId: rejecter.id,
    }
  });

  context.declareEvent(didRejectPartyInvitationEvent);

  return context;
};

/**
 * Party invite rejection command reducer
 */
export const rejectPartyInvitationReducer: Transformer<RejectPartyInvitationCommand> =
  withCommandType(CommandType.PARTY_INVITE_REJECT,
    withBasicWorldStateValidation(
      withPartyInvitee(
        reducerCore,
      ),
    ),
  );
