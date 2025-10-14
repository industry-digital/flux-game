import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { CleaveCommand, CleaveCommandArgs } from './types';

const CLEAVE_VERB = 'cleave';
const NO_ARGS: Readonly<CleaveCommandArgs> = Object.freeze({});

export const cleaveIntentParser: IntentParser<CleaveCommand> = (
  context: IntentParserContext,
  intent: Intent,
): CleaveCommand | undefined => {
  const { world } = context;

  if (intent.verb !== CLEAVE_VERB) {
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
    args: NO_ARGS,
  });
};
