import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { ListShellsCommand, ListShellsCommandArgs } from './types';
import { createActorCommand } from '~/lib/intent';

const SHELL_TOKEN = 'shell';
const LIST_TOKENS = new Set(['list', 'ls']);
const NO_ARGS: Readonly<ListShellsCommandArgs> = Object.freeze({});

export const listShellsResolver: CommandResolver<ListShellsCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): ListShellsCommand | undefined => {
  if (intent.prefix !== SHELL_TOKEN) {
    return undefined;
  }

  if (intent.tokens.length !== 1) {
    return undefined;
  }

  if (!LIST_TOKENS.has(intent.tokens[0])) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.WORKBENCH_SHELL_LIST,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
