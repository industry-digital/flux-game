import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { PartyKickCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withPartyInvitee } from '../party';
import { ActorDidLeaveParty, ActorDidLeavePartyInput, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { PartyLeaveReason } from '~/types/party';
import { ErrorCode } from '~/types/error';
import { PartyRemovalResult } from '~/worldkit/entity/group/party';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';


const PREALLOCATED_KICK_RESULT: PartyRemovalResult = {
  wasPartyDisbanded: false,
  newOwner: undefined,
};

const reducerCore: PureReducer<TransformerContext, PartyKickCommand> = (context, command, party) => {
  const kicker = context.world.actors[command.actor];
  const target = context.world.actors[command.args.targetId];

  // Only the party owner can kick members
  if (party.owner !== kicker.id) {
    context.declareError(ErrorCode.INVALID_ACTION, command.id);
    return context;
  }

  // Validate target exists
  if (!target) {
    context.declareError(ErrorCode.INVALID_TARGET, command.id);
    return context;
  }

  // Validate target is in the party
  if (!context.partyApi.isPartyMember(party, target.id)) {
    context.declareError(ErrorCode.INVALID_TARGET, command.id);
    return context;
  }

  // Can't kick yourself (use PARTY_LEAVE instead)
  if (target.id === kicker.id) {
    context.declareError(ErrorCode.INVALID_ACTION, command.id);
    return context;
  }

  // Use PartyApi to remove the member (handles ownership transfer if needed)
  const { newOwner } = context.partyApi.removePartyMember(
    party,
    target.id,
    PREALLOCATED_KICK_RESULT
  );

  // Prepare event payload
  const payload: ActorDidLeavePartyInput['payload'] = {
    partyId: party.id,
    reason: PartyLeaveReason.KICKED,
  };

  // Include new owner if ownership was transferred
  if (newOwner) {
    payload.newOwner = newOwner;
  }

  // Emit event that the target was kicked from the party
  const didLeavePartyEvent: ActorDidLeaveParty = createWorldEvent({
    type: EventType.ACTOR_DID_LEAVE_PARTY,
    trace: command.id,
    location: target.location,
    actor: target.id, // The kicked actor is the subject of the event
    payload,
  });

  context.declareEvent(didLeavePartyEvent);

  // Note: We don't emit a disband event here because PARTY_KICK
  // should never result in disbandment (owner can't kick themselves)

  return context;
};

/**
 * Party kick command reducer
 */
export const partyKickReducer: Transformer<PartyKickCommand> =
  withCommandType(CommandType.PARTY_KICK,
    withBasicWorldStateValidation(
      withPartyInvitee(
        reducerCore,
      ),
    ),
  );
