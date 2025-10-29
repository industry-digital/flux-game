import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { PartyKickCommand } from './types';
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
  // Only handle "party kick <target>" syntax
  if (intent.prefix !== PARTY_TOKEN || intent.tokens.length !== 2 || intent.tokens[0] !== KICK_TOKEN) {
    return undefined;
  }

  const targetToken = intent.tokens[1];

  // Resolve the target actor
  const target = context.resolveActor(intent, targetToken);
  if (!target) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  // Resolve the command actor (the one doing the kicking)
  const kicker = context.world.actors[intent.actor];
  if (!kicker || !kicker.party) {
    context.declareError(ErrorCode.INVALID_ACTION, intent.id);
    return undefined;
  }

  // Get the party owner (should be the kicker for this to be valid)
  const party = context.world.groups[kicker.party];
  if (!party) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  const command: PartyKickCommand = createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_KICK,
    actor: kicker.id,
    location: kicker.location,
    session: intent.session,
    group: party.id,
    args: {
      partyOwnerId: kicker.id,
      targetId: target.id,
    },
  });

  return command;
};
