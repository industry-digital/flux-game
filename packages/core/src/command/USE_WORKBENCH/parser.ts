import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { UseWorkbenchCommand, UseWorkbenchCommandArgs } from './types';
import { createActorCommand } from '~/lib/intent';

const USE_VERB = 'use';
const NO_ARGS: Readonly<UseWorkbenchCommandArgs> = {};

export const useWorkbenchIntentParser: IntentParser<UseWorkbenchCommand> = (
  context: IntentParserContext,
  intent: Intent,
): UseWorkbenchCommand | undefined => {
  if (intent.verb !== USE_VERB) {
    return undefined;
  }

  if (intent.tokens[0] !== 'workbench') {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.USE_WORKBENCH,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
