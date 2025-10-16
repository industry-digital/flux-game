import { CommandResolverContext, CommandType, Intent, CommandResolver } from '~/types/intent';
import { LookCommand } from './types';
import { createActorCommand } from '~/lib/intent';

const LOOK_VERB = 'look';

export const lookResolver: CommandResolver<LookCommand> = (
  context: CommandResolverContext,
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
