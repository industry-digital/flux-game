import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { ActorURN } from '~/types/taxonomy';
import { StrikeCommand } from './types';
import { resolveActorUrn } from '~/intent/resolvers';
import { ErrorCode } from '~/types/error';

const STRIKE_TOKEN = 'strike';

export const strikeResolver: CommandResolver<StrikeCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): StrikeCommand | undefined => {
  const { declareError } = context;

  // Check if this is a strike command
  if (intent.prefix !== STRIKE_TOKEN) {
    return undefined;
  }

  // Target is optional for strike (can use current target)
  let target: ActorURN | undefined;
  if (intent.tokens.length > 0) {
    const targetToken = intent.tokens[0];
    const target = resolveActorUrn(targetToken);
    if (!target) {
      declareError(ErrorCode.INVALID_TARGET, intent.id);
      return undefined;
    }
  }

  return createActorCommand({
    id: intent.id,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    type: CommandType.STRIKE,
    args: {
      target,
    },
  });
};
