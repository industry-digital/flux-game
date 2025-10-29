import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { SwapShellCommand } from './types';
import { createActorCommand } from '~/lib/intent';

const SHELL_PREFIX = 'shell';
const SWAP_VERB = 'swap';
const DIGITS_ONLY = /^\d+$/;

export const swapShellResolver: CommandResolver<SwapShellCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): SwapShellCommand | undefined => {
  if (intent.prefix !== SHELL_PREFIX) {
    return undefined;
  }

  if (intent.tokens.length !== 2) {
    return undefined;
  }

  if (intent.tokens[0] !== SWAP_VERB) {
    return undefined;
  }

  const targetShellId = intent.tokens[1];
  if (!DIGITS_ONLY.test(targetShellId)) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.WORKBENCH_SHELL_SWAP,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      targetShellId,
    },
  });
};
