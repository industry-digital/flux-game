import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { LookCommand } from './types';
import { createActorCommand } from '~/lib/intent';

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
    return createActorCommand({
      id: intent.id,
      type: CommandType.LOOK,
      actor: intent.actor,
      location: intent.location,
      session: intent.session,
      args: {
        target: targetActor.id,
      },
    });
  }

  const targetPlace = context.resolvePlace(intent);
  if (targetPlace) {
    return createActorCommand({
      id: intent.id,
      type: CommandType.LOOK,
      actor: intent.actor,
      location: intent.location,
      session: intent.session,
      args: {
        target: targetPlace.id,
      },
    });
  }

  const targetItem = context.resolveItem(intent);
  if (targetItem) {
    return createActorCommand({
      id: intent.id,
      type: CommandType.LOOK,
      actor: intent.actor,
      location: intent.location,
      session: intent.session,
      args: {
        target: targetItem.id,
      },
    });
  }

  return undefined;
};
