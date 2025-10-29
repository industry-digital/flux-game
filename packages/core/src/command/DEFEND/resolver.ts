import {
  CommandResolver,
  CommandResolverContext,
  CommandType,
  Intent,
} from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { DefendCommand } from './types';

const DEFEND_VERB = 'defend';

export const defendResolver: CommandResolver<DefendCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): DefendCommand | undefined => {
  const { world } = context;

  // Check if this is a defend command
  if (intent.prefix !== DEFEND_VERB) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.DEFEND,
    actor: actor.id,
    location: actor.location,
    session: intent.session,
    args: {
      autoDone: false // User-initiated defend, not auto-generated
    },
  });
};
