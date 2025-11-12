import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { PartyStatusCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withOwnParty } from '../party';
import { ActorDidInspectPartyInput, EventType } from '~/types/event';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, PartyStatusCommand> = (context, command, party) => {
  const { world, declareEvent } = context;
  const actor = world.actors[command.actor];
  const isGroupOwner = party.owner === actor.id;

  const payload: ActorDidInspectPartyInput['payload'] = {
    partyId: party.id,
    owner: party.owner,
    members: party.members, // Zero-copy reference
  };

  if (isGroupOwner) {
    payload.invitations = party.invitations; // Zero-copy again
  }

  declareEvent({
    type: EventType.ACTOR_DID_INSPECT_PARTY,
    trace: command.id,
    location: actor.location,
    actor: actor.id,
    payload,
  });

  return context;
};

/**
 * Party inspect command reducer
 */
export const partyInspectReducer: Transformer<PartyStatusCommand> =
  withCommandType(CommandType.PARTY_STATUS,
    withBasicWorldStateValidation(
      withOwnParty(
        reducerCore,
      ),
    ),
  );
