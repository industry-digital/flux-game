import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { TargetCommand } from './types';

const TARGET_VERB = 'target';

export const targetResolver: CommandResolver<TargetCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): TargetCommand | undefined => {
  const { world } = context;

  // Check if this is a target command
  if (intent.verb !== TARGET_VERB) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    return undefined;
  }

  const targetToken = intent.tokens[0];
  const target = context.resolveActor(intent, targetToken, true);
  if (!target) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    actor: actor.id,
    location: actor.location,
    type: CommandType.TARGET,
    args: {
      target: target.id
    },
  });
};
