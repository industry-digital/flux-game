import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { AcceptPartyInvitationCommand } from './types';
import { ErrorCode } from '~/types/error';

const PARTY_TOKEN = 'party';
const ACCEPT_TOKEN = 'accept';

/**
 * Syntax:
 *
 *   `party invite <invitee>`
 *
 * Example:
 *
 *   `party invite bob`
 */
export const acceptPartyInvitationResolver: CommandResolver<AcceptPartyInvitationCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AcceptPartyInvitationCommand | undefined => {
  if (intent.verb !== PARTY_TOKEN) {
    return undefined;
  }

  if (intent.tokens.length < 2) {
    return undefined;
  }

  const [action, partyOwnerToken] = intent.tokens;
  if (action !== ACCEPT_TOKEN) {
    return undefined;
  }

  const partyOwner = context.resolveActor(intent, partyOwnerToken);
  if (!partyOwner) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  if (!partyOwner.party) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  const command: AcceptPartyInvitationCommand = createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_INVITE_ACCEPT,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    group: intent.group, // --> IMPORTANT! This is the party group ID.
    args: {
      partyId: partyOwner.party,
      partyOwnerId: partyOwner.id,
    },
  });

  return command;
};
