import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { PartyInviteCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { createWorldEvent } from '~/worldkit/event';
import { ActorDidCreateParty, EventType, PartyInvitationEventPayload } from '~/types/event';
import { ErrorCode } from '~/types/error';
import { Party } from '~/types/entity/group';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, PartyInviteCommand> = (context, command) => {
  const { world, failed, partyApi, declareEvent } = context;
  const owner = world.actors[command.actor];

  console.log(`[PARTY_INVITE_DEBUG] *** PROCESSING COMMAND ${command.id} *** actor=${command.actor}, owner.party=${owner.party}`);

  let party: Party | undefined = owner.party ? world.groups[owner.party] as Party : undefined;

  console.log(`[PARTY_INVITE_DEBUG] Command ${command.id}: party lookup result=${party ? party.id : 'undefined'}`);

  if (party) {
    console.log(`[PARTY_INVITE_DEBUG] Command ${command.id}: using existing party ${party.id}, owner=${party.owner}`);
    if (party.owner !== owner.id) {
      return failed(command.id, ErrorCode.FORBIDDEN);
    }
  } else {
    console.log(`[PARTY_INVITE_DEBUG] Command ${command.id}: creating new party for ${owner.id}`);

    // Create the party with the inviting actor as the owner
    party = context.partyApi.createParty(owner.id);

    console.log(`[PARTY_INVITE_DEBUG] Command ${command.id}: created party ${party.id}, owner.party now=${owner.party}`);

    const partyCreatedEvent: ActorDidCreateParty = createWorldEvent({
      type: EventType.ACTOR_DID_CREATE_PARTY,
      trace: command.id,
      location: owner.location,
      actor: owner.id,
      payload: {
        partyId: party.id,
      },
    });

    console.log(`[PARTY_INVITE_DEBUG] Command ${command.id}: declaring ACTOR_DID_CREATE_PARTY event for party ${party.id}`);
    declareEvent(partyCreatedEvent);
  }

  const invitee = world.actors[command.args.invitee];
  if (!invitee) {
    return failed(command.id, ErrorCode.ACTOR_NOT_FOUND);
  }

  // Actually send the invitation using the Party API
  partyApi.inviteToParty(party, invitee.id);

  const payload: PartyInvitationEventPayload = {
    partyId: party.id,
    inviterId: owner.id,
    inviteeId: invitee.id,
  };

  // Emit event that the party owner issued the invitation
  declareEvent({
    trace: command.id,
    type: EventType.ACTOR_DID_ISSUE_PARTY_INVITATION,
    actor: owner.id,
    location: owner.location,
    payload,
  });

  // Emit event that the invitee received an invitation
  declareEvent({
    trace: command.id,
    type: EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION,
    actor: invitee.id, // The invitee is the one receiving the invitation
    location: invitee.location,
    payload,
  });

  console.log(`[PARTY_INVITE_DEBUG] Command ${command.id}: completed, final party=${party.id}, total declared events=${context.getDeclaredEvents().length}`);

  const partyCreationEvents = context.getDeclaredEvents().filter(e => e.type === EventType.ACTOR_DID_CREATE_PARTY);
  console.log(`[PARTY_INVITE_DEBUG] Command ${command.id}: total ACTOR_DID_CREATE_PARTY events declared so far: ${partyCreationEvents.length}`);
  partyCreationEvents.forEach((event: any, index) => {
    console.log(`[PARTY_INVITE_DEBUG] Command ${command.id}: ACTOR_DID_CREATE_PARTY[${index}]: actor=${event.actor}, partyId=${event.payload.partyId}, trace=${event.trace}`);
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
