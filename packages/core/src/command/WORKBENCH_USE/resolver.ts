import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { UseWorkbenchCommand, UseWorkbenchCommandArgs } from './types';
import { createActorCommand } from '~/lib/intent';

const USE_VERB = 'use';
const NO_ARGS: Readonly<UseWorkbenchCommandArgs> = Object.freeze({});
const WORKBENCH = 'workbench';

export const activateWorkbenchResolver: CommandResolver<UseWorkbenchCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): UseWorkbenchCommand | undefined => {
  if (intent.prefix !== USE_VERB) {
    return undefined;
  }

  if (intent.tokens[0] !== WORKBENCH) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.WORKBENCH_USE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
