import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { resolveActorUrn } from '~/intent/resolvers';
import { TargetCommand } from './types';

const TARGET_VERB = 'target';

export const targetResolver: CommandResolver<TargetCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): TargetCommand | undefined => {

  // Check if this is a target command
  if (intent.prefix !== TARGET_VERB) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    return undefined;
  }

  const targetToken = intent.tokens[0];
  const targetUrn = resolveActorUrn(targetToken);
  if (!targetUrn) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.TARGET,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      target: targetUrn
    },
  });
};
