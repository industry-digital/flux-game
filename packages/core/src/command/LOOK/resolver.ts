import { CommandResolverContext, CommandType, Intent, CommandResolver } from '~/types/intent';
import { LookCommand } from './types';
import { createActorCommand } from '~/lib/intent';

const LOOK_PREFIX = 'look';

export const lookResolver: CommandResolver<LookCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): LookCommand | undefined => {
  if (intent.prefix !== LOOK_PREFIX) {
    return undefined;
  }

  // LOOK without a target is interpreted as "look at the place I am in"
  if (intent.tokens.length === 0) {
    return createActorCommand({
      id: intent.id,
      type: CommandType.LOOK,
      actor: intent.actor,
      location: intent.location,
      session: intent.session,
      args: {
        target: intent.location,
      },
    });
  }

  // Fell through, so there is a target token
  // But we don't have enough context to understand if this is an actor, item, or place
  // So the only logical thing to do is pass the token along to the reducer to handle.
  const [targetToken] = intent.tokens;

  return createActorCommand({
    id: intent.id,
    type: CommandType.LOOK,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      target: targetToken,
    },
  });
};
