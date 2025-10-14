import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { LookCommand } from './types';

const LOOK_VERB = 'look';

export const lookIntentParser: IntentParser<LookCommand> = (
  context: IntentParserContext,
  intent: Intent,
): LookCommand | undefined => {
  if (intent.verb !== LOOK_VERB) {
    return undefined;
  }

  const targetActor = context.resolveActor(intent)
  if (targetActor) {
    return {
      __type: 'command',
      id: context.uniqid(),
      ts: context.timestamp(),
      actor: intent.actor,
      location: intent.location,
      type: CommandType.LOOK,
      args: {
        target: targetActor.id,
      },
    };
  }

  const targetPlace = context.resolvePlace(intent);
  if (targetPlace) {
    return {
      __type: 'command',
      id: context.uniqid(),
      ts: context.timestamp(),
      actor: intent.actor,
      location: intent.location,
      type: CommandType.LOOK,
      args: {
        target: targetPlace.id,
      },
    };
  }

  const targetItem = context.resolveItem(intent);
  if (targetItem) {
    return {
      __type: 'command',
      id: context.uniqid(),
      ts: context.timestamp(),
      actor: intent.actor,
      location: intent.location,
      type: CommandType.LOOK,
      args: {
        target: targetItem.id,
      },
    };
  }

  return undefined;
};
