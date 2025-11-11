import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { AcceptPartyInvitationCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withPartyInvitee } from '../party';
import { ErrorCode } from '~/types/error';
import { ActorDidAcceptPartyInvitation, ActorDidJoinParty, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, AcceptPartyInvitationCommand> = (context, command, party) => {
  const { world, partyApi, declareEvent, declareError } = context;
  const invitee = world.actors[command.actor];

  if (partyApi.isPartyMember(party, command.actor)) {
    // Nothing to do
    return context;
  }

  try {
    partyApi.acceptInvitation(party, invitee.id);
  } catch (error) {
    // Handle cases like: no pending invitation, already a member, etc.
    declareError(ErrorCode.INVALID_TARGET, command.id);
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

  // Emit event that the invitee joined the party
  const didJoinPartyEvent: ActorDidJoinParty = createWorldEvent({
    type: EventType.ACTOR_DID_JOIN_PARTY,
    trace: command.id,
    location: invitee.location,
    actor: invitee.id,
    payload: {
      partyId: party.id,
    }
  });

  declareEvent(didAcceptPartyInvitationEvent);
  declareEvent(didJoinPartyEvent);

  return context;
};

/**
 * Party invite command reducer
 */
export const acceptPartyInvitationReducer: Transformer<AcceptPartyInvitationCommand> =
  withCommandType(CommandType.PARTY_INVITE_ACCEPT,
    withBasicWorldStateValidation(
      withPartyInvitee(
        reducerCore,
      ),
    ),
  );
