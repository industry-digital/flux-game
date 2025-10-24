import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { PartyInviteCommand } from './types';
import { ErrorCode } from '~/types/error';

const PARTY_TOKEN = 'party';
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
  if (intent.verb !== PARTY_TOKEN) {
    return undefined;
  }

  if (intent.tokens.length < 2) {
    return undefined;
  }

  const [action, invitee] = intent.tokens;
  if (action !== INVITE_TOKEN) {
    context.declareError(ErrorCode.INVALID_ACTION, intent.id);
    return undefined;
  }

  const inviteeActor = context.resolveActor(intent, invitee);
  if (!inviteeActor) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_INVITE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      invitee: inviteeActor.id,
    },
  });
};
