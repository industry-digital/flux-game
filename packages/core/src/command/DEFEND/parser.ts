import {
  Intent,
  IntentParser,
  IntentParserContext,
} from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { DefendCommand } from './types';

const DEFEND_VERB = 'defend';

export const defendIntentParser: IntentParser<DefendCommand> = (
  context: IntentParserContext,
  intent: Intent,
): DefendCommand | undefined => {
  const { world } = context;

  // Check if this is a defend command
  if (intent.verb !== DEFEND_VERB) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  return createActorCommand({
    trace: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.DEFEND,
    args: {
      autoDone: false // User-initiated defend, not auto-generated
    },
  });
};
