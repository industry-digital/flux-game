import { Transformer } from '~/types/handler';
import { PartyDisbandCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withOwnParty } from '../party';
import { ActorDidDisbandParty, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { ErrorCode } from '~/types/error';
import { ActorURN } from '~/types/taxonomy';

/**
 * Party disband command reducer
 */
export const partyDisbandReducer: Transformer<PartyDisbandCommand> = withBasicWorldStateValidation(
  withOwnParty(
    (context, command, party) => {
      const disbander = context.world.actors[command.actor];

      // Only the party owner can disband the party
      if (party.owner !== disbander.id) {
        context.declareError(ErrorCode.INVALID_ACTION, command.id);
        return context;
      }

      // Capture party data before disbanding (for zero-copy event)
      const formerMembers = party.members;
      const cancelledInvitations = party.invitations;
      const partyId = party.id;

      // Clear all members' party references
      for (const memberId in party.members) {
        const member = context.world.actors[memberId as ActorURN];
        if (member) {
          delete member.party;
        }
      }

      // Remove the party from the world
      delete context.world.groups[party.id];

      // Emit disbandment event with zero-copy references
      const didDisbandPartyEvent: ActorDidDisbandParty = createWorldEvent({
        type: EventType.ACTOR_DID_DISBAND_PARTY,
        trace: command.id,
        location: disbander.location,
        actor: disbander.id,
        payload: {
          partyId,
          formerMembers, // Zero-copy reference to the party's member data
          cancelledInvitations, // Zero-copy reference to the party's invitation data
        },
      });

      context.declareEvent(didDisbandPartyEvent);

      return context;
    }
  ),
);
