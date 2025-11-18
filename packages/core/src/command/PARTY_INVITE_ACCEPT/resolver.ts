import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { resolveActorUrn } from '~/intent/resolvers';
import { AcceptPartyInvitationCommand } from './types';

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
  if (intent.prefix !== PARTY_TOKEN) {
    return undefined;
  }

  if (intent.tokens.length < 2) {
    return undefined;
  }

  const [action, partyOwnerToken] = intent.tokens;
  if (action !== ACCEPT_TOKEN) {
    return undefined;
  }

  const partyOwnerUrn = resolveActorUrn(partyOwnerToken);
  if (!partyOwnerUrn) {
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
      partyOwnerId: partyOwnerUrn,
    },
  });

  return command;
};
