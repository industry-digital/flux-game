import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { ActorURN } from '~/types/taxonomy';
import { StrikeCommand } from './types';

const STRIKE_VERB = 'strike';

export const strikeResolver: CommandResolver<StrikeCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): StrikeCommand | undefined => {
  const { world } = context;

  // Check if this is a strike command
  if (intent.prefix !== STRIKE_VERB) {
    return undefined;
  }

  const attacker = world.actors[intent.actor];
  if (!attacker) {
    return undefined;
  }

  // Target is optional for strike (can use current target)
  let target: ActorURN | undefined;
  if (intent.tokens.length > 0) {
    const targetToken = intent.tokens[0];
    const target = context.resolveActor(intent, targetToken, true);
    if (!target) {
      context.declareError(`STRIKE: invalid target "${targetToken}"`);
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
