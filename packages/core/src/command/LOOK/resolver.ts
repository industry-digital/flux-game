import { CommandResolverContext, CommandType, Intent, CommandResolver } from '~/types/intent';
import { LookCommand } from './types';
import { createActorCommand } from '~/lib/intent';

const LOOK_VERB = 'look';

export const lookResolver: CommandResolver<LookCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): LookCommand | undefined => {
  if (intent.prefix !== LOOK_VERB) {
    return undefined;
  }

  // LOOK without a target is interpreted as "look at the place I am in"
  if (intent.tokens.length === 0) {
    return createActorCommand({
      id: intent.id,
      type: CommandType.LOOK,
      actor: intent.actor,
      session: intent.session,
      args: {
        target: intent.location,
      },
    });
  }

  // Fell through, so there is a target token
  const [targetToken] = intent.tokens;

  // See if it matches an actor
  const targetActor = context.resolveActor(intent, targetToken);
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

  // See if it matches a place
  const targetPlace = context.resolvePlace(intent, targetToken);
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

  // See if it matches an item
  const targetItem = context.resolveItem(intent, targetToken);
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
