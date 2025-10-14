import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { CleaveCommand } from './types';

export const cleaveIntentParser: IntentParser<CleaveCommand> = (
  context: IntentParserContext,
  intent: Intent,
): CleaveCommand | undefined => {
  const { world } = context;

  // Check if this is a cleave command
  if (!intent.verb.startsWith('cleave')) {
    return undefined;
  }

  const attacker = world.actors[intent.actor];
  if (!attacker) {
    return undefined;
  }

  if (!attacker.location) {
    return undefined;
  }

  return createActorCommand({
    trace: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.CLEAVE,
    args: {
      // No arguments needed for cleave
    },
  });
};
