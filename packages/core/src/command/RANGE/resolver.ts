import { CommandResolverContext, CommandType, Intent, CommandResolver } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { RangeCommand } from './types';

const RANGE_VERB = 'range';

export const rangeResolver: CommandResolver<RangeCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): RangeCommand | undefined => {
  const { world } = context;

  // Check if this is a range command
  if (intent.verb !== RANGE_VERB) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    return undefined;
  }

  const [targetToken] = intent.tokens;
  const target = context.resolveActor(intent, targetToken, true);
  if (!target) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.RANGE,
    actor: actor.id,
    location: actor.location,
    session: intent.session,
    args: {
      target: target.id,
    },
  });
};
