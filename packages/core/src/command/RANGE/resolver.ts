import { CommandResolverContext, CommandType, Intent, CommandResolver } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { RangeCommand } from './types';

const RANGE_VERB = 'range';

export const rangeResolver: CommandResolver<RangeCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): RangeCommand | undefined => {
  const { resolveActor } = context;

  // Check if this is a range command
  if (intent.verb !== RANGE_VERB) {
    return undefined;
  }

  const target = resolveActor(intent, true);
  if (!target) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.RANGE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      target: target.id,
    },
  });
};
