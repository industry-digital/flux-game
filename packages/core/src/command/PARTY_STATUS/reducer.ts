import { Transformer } from '~/types/handler';
import { PartyStatusCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withOwnParty } from '../party';
import { ActorDidInspectParty, ActorDidInspectPartyInput, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';

/**
 * Party inspect command reducer
 */
export const partyInspectReducer: Transformer<PartyStatusCommand> = withBasicWorldStateValidation(
  withOwnParty(
    (context, command, party) => {
      const inspector = context.world.actors[command.actor];

      // Determine if invitations should be included (only for party owner)
      const includeInvitations = party.owner === inspector.id;

      const payload: ActorDidInspectPartyInput['payload'] = {
        partyId: party.id,
        owner: party.owner,
        members: party.members, // Zero-copy reference
      };

      if (includeInvitations) {
        payload.invitations = party.invitations; // Zero-copy again
      }

      // Emit event with zero-copy party data
      const didInspectPartyEvent: ActorDidInspectParty = createWorldEvent({
        type: EventType.ACTOR_DID_INSPECT_PARTY,
        trace: command.id,
        location: inspector.location,
        actor: inspector.id,
        payload,
      });

      context.declareEvent(didInspectPartyEvent);

      return context;
    }
  ),
);
