import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { PartyDisbandCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withOwnParty } from '../party';
import { EventType } from '~/types/event';
import { ActorURN } from '~/types/taxonomy';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { withGroupOwnerValidation } from '~/command/party';

const reducerCore: PureReducer<TransformerContext, PartyDisbandCommand> = (context, command, party) => {
  const { world, declareEvent } = context;
  const actor = world.actors[command.actor];

  // Capture party data before disbanding
  const formerMembers = party.members;
  const cancelledInvitations = party.invitations;

  // Clear all members' party references
  for (const memberId in party.members) {
    const member = world.actors[memberId as ActorURN];
    if (member) {
      delete member.party;
    }
  }

  // Remove the party from the world
  delete world.groups[party.id];

  // Emit disbandment event
  declareEvent({
    type: EventType.ACTOR_DID_DISBAND_PARTY,
    trace: command.id,
    location: actor.location,
    actor: actor.id,
    payload: {
      partyId: party.id,
      formerMembers,
      cancelledInvitations,
    },
  });

  return context;
};

/**
 * Party disband command reducer
 */
export const partyDisbandReducer: Transformer<PartyDisbandCommand> =
  withCommandType(CommandType.PARTY_DISBAND,
    withBasicWorldStateValidation(
      withOwnParty(
        withGroupOwnerValidation(
          reducerCore,
        ),
      ),
    ),
  );
