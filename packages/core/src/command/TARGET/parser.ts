import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { TargetCommand } from './types';

const TARGET_VERB = 'target';

export const targetIntentParser: IntentParser<TargetCommand> = (
  context: IntentParserContext,
  intent: Intent,
): TargetCommand | undefined => {
  const { world, resolveActor } = context;

  // Check if this is a target command
  if (intent.verb !== TARGET_VERB) {
    return undefined;
  }

  const target = resolveActor(intent);
  if (!target) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  if (actor.location !== target.location) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.TARGET,
    args: {
      target: target.id
    },
  });
};
