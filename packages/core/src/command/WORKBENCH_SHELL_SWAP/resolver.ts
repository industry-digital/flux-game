import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { SwapShellCommand } from './types';
import { createActorCommand } from '~/lib/intent';

const SHELL_VERB = 'shell';
const SWAP_VERB = 'swap';

export const shellSwapResolver: CommandResolver<SwapShellCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): SwapShellCommand | undefined => {
  if (intent.verb !== SHELL_VERB) {
    return undefined;
  }

  if (intent.tokens.length !== 2) {
    return undefined;
  }

  if (intent.tokens[1] !== SWAP_VERB) {
    return undefined;
  }

  const targetShellNameOrId = intent.tokens[2];

  return createActorCommand({
    id: intent.id,
    type: CommandType.WORKBENCH_SHELL_SWAP,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      targetShellNameOrId,
    },
  });
};
