import { CommandResolverContext, CommandType, Intent, CommandResolver } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { RangeCommand } from './types';
import { resolveActorUrn } from '~/intent/resolvers';

const RANGE_VERB = 'range';

export const rangeResolver: CommandResolver<RangeCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): RangeCommand | undefined => {
  // Check if this is a range command
  if (intent.prefix !== RANGE_VERB) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    return undefined;
  }

  const [targetToken] = intent.tokens;
  const targetActorId = resolveActorUrn(targetToken);
  if (!targetActorId) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.RANGE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      target: targetActorId,
    },
  });
};
