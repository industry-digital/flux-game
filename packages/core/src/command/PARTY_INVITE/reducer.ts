import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { PartyInviteCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { createWorldEvent } from '~/worldkit/event';
import { ActorDidCreateParty, EventType } from '~/types/event';
import { ErrorCode } from '~/types/error';
import { Party } from '~/types/entity/group';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, PartyInviteCommand> = (context, command) => {
  const { world, failed, partyApi, declareEvent } = context;
  const actor = world.actors[command.actor];

  let party: Party | undefined = actor.party ? world.groups[actor.party] as Party : undefined;
  if (!party) {
    // Create the party with the inviting actor as the owner
    party = context.partyApi.createParty(actor.id);

    const partyCreatedEvent: ActorDidCreateParty = createWorldEvent({
      type: EventType.ACTOR_DID_CREATE_PARTY,
      trace: command.id,
      location: actor.location,
      actor: actor.id,
      payload: {
        partyId: party.id,
      },
    });

    declareEvent(partyCreatedEvent);
  } else {
    // If party already exists, only the owner can invite
    if (party.owner !== actor.id) {
      return failed(command.id, ErrorCode.FORBIDDEN);
    }
  }

  const invitee = world.actors[command.args.invitee];
  if (!invitee) {
    return failed(command.id, ErrorCode.ACTOR_NOT_FOUND);
  }

  // Actually send the invitation using the Party API
  partyApi.inviteToParty(party, invitee.id);

  // Emit event that the invitee received an invitation
  declareEvent({
    trace: command.id,
    type: EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION,
    actor: invitee.id, // The invitee is the one receiving the invitation
    location: command.location!,
    payload: {
      partyId: party.id,
      inviterId: party.owner!,
      inviteeId: invitee.id,
    },
  });

  return context;
};

/**
 * Party invite command reducer
 *
 * Note: We don't use withOwnParty here because the actor may not have a party yet.
 * The reducer creates a party if needed.
 */
export const partyInviteReducer: Transformer<PartyInviteCommand> =
  withCommandType(CommandType.PARTY_INVITE,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );
