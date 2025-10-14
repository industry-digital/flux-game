import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { UseWorkbenchCommand, UseWorkbenchCommandArgs } from './types';

const USE_VERB = 'use';
const NO_ARGS: Readonly<UseWorkbenchCommandArgs> = {};

export const useWorkbenchIntentParser: IntentParser<UseWorkbenchCommand> = (
  context: IntentParserContext,
  intent: Intent,
): UseWorkbenchCommand | undefined => {
  if (intent.verb !== USE_VERB) {
    return undefined;
  }

  if (intent.tokens[1] !== 'workbench') {
    return undefined;
  }

  return {
    __type: 'command',
    id: context.uniqid(),
    ts: context.timestamp(),
    actor: intent.actor,
    location: intent.location,
    type: CommandType.USE_WORKBENCH,
    args: NO_ARGS,
  };
};
