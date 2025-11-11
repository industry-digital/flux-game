import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { PartyLeaveCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withOwnParty } from '../party';
import { ActorDidDisbandParty, ActorDidLeaveParty, ActorDidLeavePartyInput, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { PartyLeaveReason } from '~/types/party';
import { PartyRemovalResult } from '~/worldkit/entity/group/party';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const PREALLOCATED_LEAVE_PARTY_RESULT: PartyRemovalResult = {
  wasPartyDisbanded: false,
  newOwner: undefined,
};

const reducerCore: PureReducer<TransformerContext, PartyLeaveCommand> = (context, command, party) => {
  const leaver = context.world.actors[command.actor];


  // Let the PartyApi handle all the mechanics (ownership transfer, disbandment, etc.)
  const { wasPartyDisbanded, newOwner } = context.partyApi.removePartyMember(party, leaver.id, PREALLOCATED_LEAVE_PARTY_RESULT);

  // Prepare event payload
  const payload: ActorDidLeavePartyInput['payload'] = {
    partyId: party.id,
    reason: PartyLeaveReason.VOLUNTARY,
  };

  // Include new owner if ownership was transferred
  if (newOwner) {
    payload.newOwner = newOwner;
  }

  // Emit event that the actor left the party
  const didLeavePartyEvent: ActorDidLeaveParty = createWorldEvent({
    type: EventType.ACTOR_DID_LEAVE_PARTY,
    trace: command.id,
    location: leaver.location,
    actor: leaver.id,
    payload,
  });

  context.declareEvent(didLeavePartyEvent);

  // If the party was disbanded (last member left), emit disbandment event
  if (wasPartyDisbanded) {
    const didDisbandPartyEvent: ActorDidDisbandParty = createWorldEvent({
      type: EventType.ACTOR_DID_DISBAND_PARTY,
      trace: command.id,
      location: leaver.location,
      actor: leaver.id,
      payload: {
        partyId: party.id,
        formerMembers: party.members,
        cancelledInvitations: party.invitations,
      },
    });

    context.declareEvent(didDisbandPartyEvent);
  }

  return context;
};

/**
 * Party leave command reducer
 */
export const partyLeaveReducer: Transformer<PartyLeaveCommand> =
  withCommandType(CommandType.PARTY_LEAVE,
    withBasicWorldStateValidation(
      withOwnParty(
        reducerCore,
      ),
    ),
  );
