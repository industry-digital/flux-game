import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { PartyKickCommand } from './types';
import { resolveActorUrn } from '~/intent/resolvers';
import { ErrorCode } from '~/types/error';

const PARTY_TOKEN = 'party';
const KICK_TOKEN = 'kick';

/**
 * Syntax:
 *
 *   `party kick <target>`
 *
 * Examples:
 *
 *   `party kick bob`
 *   `party kick alice`
 */
export const partyKickResolver: CommandResolver<PartyKickCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): PartyKickCommand | undefined => {
  const { declareError } = context;

  // Only handle "party kick <target>" syntax
  if (intent.prefix !== PARTY_TOKEN || intent.tokens.length !== 2 || intent.tokens[0] !== KICK_TOKEN) {
    return undefined;
  }

  const targetToken = intent.tokens[1];
  const targetActorId = resolveActorUrn(targetToken);
  if (!targetActorId) {
    declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_KICK,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    group: intent.group,
    args: {
      partyOwnerId: intent.actor,
      targetId: targetActorId,
    },
  });
};
