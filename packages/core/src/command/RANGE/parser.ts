import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { RangeCommand } from './types';

const RANGE_VERB = 'range';

export const rangeIntentParser: IntentParser<RangeCommand> = (
  context: IntentParserContext,
  intent: Intent,
): RangeCommand | undefined => {
  const { world, resolveActor } = context;

  // Check if this is a range command
  if (intent.verb !== RANGE_VERB) {
    return undefined;
  }

  const target = resolveActor(intent);
  if (!target) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.RANGE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      target: target.id,
    },
  });
};
