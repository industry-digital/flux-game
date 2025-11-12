import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { PartyKickCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withGroupOwnerValidation, withPartyInvitee } from '../party';
import { ActorDidLeavePartyInput, EventType } from '~/types/event';
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
  const { world, failed, declareEvent, partyApi } = context;
  const actor = world.actors[command.actor];
  const target = world.actors[command.args.targetId];

  // Validate target exists
  if (!target) {
    return failed(command.id, ErrorCode.ACTOR_NOT_FOUND);
  }

  // Validate target is in the party
  if (!partyApi.isPartyMember(party, target.id)) {
    return failed(command.id, ErrorCode.INVALID_TARGET);
  }

  // Can't kick yourself (use PARTY_LEAVE instead)
  if (target.id === actor.id) {
    return failed(command.id, ErrorCode.INVALID_TARGET);
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
  declareEvent({
    type: EventType.ACTOR_DID_LEAVE_PARTY,
    trace: command.id,
    location: target.location,
    actor: target.id, // The kicked actor is the subject of the event
    payload,
  });

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
        withGroupOwnerValidation(
          reducerCore,
        ),
      ),
    ),
  );
