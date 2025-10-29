import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { AssessShellStatusCommand, AssessShellStatusCommandArgs } from './types';
import { createActorCommand } from '~/lib/intent';

const SHELL_PREFIX = 'shell';
const STATUS_TOKENS = new Set(['stat', 'status']);
const NO_ARGS: Readonly<AssessShellStatusCommandArgs> = Object.freeze({});

export const shellStatusResolver: CommandResolver<AssessShellStatusCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AssessShellStatusCommand | undefined => {
  if (intent.prefix !== SHELL_PREFIX) {
    return undefined;
  }

  if (intent.tokens.length !== 1) {
    return undefined;
  }

  if (!STATUS_TOKENS.has(intent.tokens[0])) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.WORKBENCH_SHELL_STATUS,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
