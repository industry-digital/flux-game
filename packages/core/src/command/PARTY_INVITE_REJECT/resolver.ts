import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { resolveActorUrn } from '~/intent/resolvers';
import { RejectPartyInvitationCommand } from './types';
import { ErrorCode } from '~/types/error';

const PARTY_TOKEN = 'party';
const REJECT_TOKEN = 'reject';

/**
 * Syntax:
 *
 *   `party reject <party_owner>`
 *
 * Example:
 *
 *   `party reject alice`
 */
export const rejectPartyInvitationResolver: CommandResolver<RejectPartyInvitationCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): RejectPartyInvitationCommand | undefined => {
  const { declareError } = context;

  if (intent.prefix !== PARTY_TOKEN) {
    return undefined;
  }

  if (intent.tokens.length < 2) {
    return undefined;
  }

  const [action, partyOwnerToken] = intent.tokens;
  if (action !== REJECT_TOKEN) {
    return undefined;
  }

  const partyOwnerUrn = resolveActorUrn(partyOwnerToken);
  if (!partyOwnerUrn) {
    declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_INVITE_REJECT,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      partyOwnerId: partyOwnerUrn,
    },
  });
};
