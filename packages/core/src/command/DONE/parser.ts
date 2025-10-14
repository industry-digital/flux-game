import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { DoneCommand, DoneCommandArgs } from './types';

const DONE_VERB = 'done';
const DEFAULT_DONE_ARGS: Readonly<DoneCommandArgs> = Object.freeze({});

export const doneIntentParser: IntentParser<DoneCommand> = (
  context: IntentParserContext,
  intent: Intent,
): DoneCommand | undefined => {
  // Check if this is a done command
  if (intent.verb !== DONE_VERB) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.DONE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: DEFAULT_DONE_ARGS,
  });
};
