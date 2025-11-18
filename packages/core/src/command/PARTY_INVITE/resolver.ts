import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { resolveActorUrn } from '~/intent/resolvers';
import { PartyInviteCommand } from './types';

const PARTY_PREFIX = 'party';
const INVITE_TOKEN = 'invite';

/**
 * Syntax:
 *
 *   `party invite <invitee>`
 *
 * Example:
 *
 *   `party invite bob`
 */
export const partyInviteResolver: CommandResolver<PartyInviteCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): PartyInviteCommand | undefined => {
  if (intent.prefix !== PARTY_PREFIX) {
    return undefined;
  }

  if (intent.tokens.length < 2) {
    return undefined;
  }

  const [action, invitee] = intent.tokens;
  if (action !== INVITE_TOKEN) {
    return undefined;
  }

  const inviteeUrn = resolveActorUrn(invitee);
  if (!inviteeUrn) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_INVITE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      invitee: inviteeUrn,
    },
  });
};
