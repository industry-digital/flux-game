import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { DoneCommand, DoneCommandArgs } from './types';

const DONE_VERB = 'done';
const NO_ARGS: Readonly<DoneCommandArgs> = Object.freeze({});

export const doneResolver: CommandResolver<DoneCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): DoneCommand | undefined => {
  // Check if this is a done command
  if (intent.prefix !== DONE_VERB) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.DONE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
