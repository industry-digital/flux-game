import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { PartyInviteCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { createWorldEvent } from '~/worldkit/event';
import { ActorDidCreateParty, ActorDidReceivePartyInvitation, EventType } from '~/types/event';
import { ErrorCode } from '~/types/error';
import { Party } from '~/types/entity/group';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, PartyInviteCommand> = (context, command) => {
  const { world, partyApi, declareEvent, declareError } = context;
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
  }

  const invitee = world.actors[command.args.invitee];
  if (!invitee) {
    declareError(ErrorCode.INVALID_TARGET, command.id);
    return context;
  }

  // Actually send the invitation using the Party API
  partyApi.inviteToParty(party, invitee.id);

  // Emit event that the invitee received an invitation
  const didReceivePartyInvitationEvent: ActorDidReceivePartyInvitation = createWorldEvent({
    type: EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION,
    trace: command.id,
    location: command.location!,
    actor: invitee.id, // The invitee is the one receiving the invitation
    payload: {
      partyId: party.id,
      inviterId: party.owner!,
      inviteeId: invitee.id,
    },
  });

  declareEvent(didReceivePartyInvitationEvent);

  return context;
};

/**
 * Party invite command reducer
 */
export const partyInviteReducer: Transformer<PartyInviteCommand> =
  withCommandType(CommandType.PARTY_INVITE,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );
