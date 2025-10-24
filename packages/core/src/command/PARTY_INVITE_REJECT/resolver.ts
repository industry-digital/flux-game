import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
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
  if (intent.verb !== PARTY_TOKEN) {
    return undefined;
  }

  if (intent.tokens.length < 2) {
    return undefined;
  }

  const [action, partyOwnerToken] = intent.tokens;
  if (action !== REJECT_TOKEN) {
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

  const command: RejectPartyInvitationCommand = createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_INVITE_REJECT,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    group: partyOwner.party,
    args: {
      partyOwnerId: partyOwner.id,
    },
  });

  return command;
};
