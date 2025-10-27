import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { ListShellsCommand, ListShellsCommandArgs } from './types';
import { createActorCommand } from '~/lib/intent';

const SHELL_VERB = 'shell';
const LIST_VERBS = new Set(['list', 'ls']);
const NO_ARGS: Readonly<ListShellsCommandArgs> = Object.freeze({});

export const listShellsResolver: CommandResolver<ListShellsCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): ListShellsCommand | undefined => {
  if (intent.verb !== SHELL_VERB) {
    return undefined;
  }

  if (intent.tokens.length !== 1) {
    return undefined;
  }

  if (!LIST_VERBS.has(intent.tokens[1])) {
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
