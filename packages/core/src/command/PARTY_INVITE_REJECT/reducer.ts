import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { RejectPartyInvitationCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withPartyInvitee } from '../party';
import { ErrorCode } from '~/types/error';
import { EventType } from '~/types/event';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, RejectPartyInvitationCommand> = (context, command, party) => {
  const { world, failed, declareEvent } = context;
  const actor = world.actors[command.actor];

  try {
    context.partyApi.rejectInvitation(party, actor.id);
  } catch (error) {
    // Handle cases like: no pending invitation, etc.
    return failed(command.id, ErrorCode.FORBIDDEN);
  }

  declareEvent({
    type: EventType.ACTOR_DID_REJECT_PARTY_INVITATION,
    trace: command.id,
    location: actor.location,
    actor: actor.id,
    payload: {
      partyId: party.id,
      inviterId: party.owner!,
      inviteeId: actor.id,
    }
  });

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
