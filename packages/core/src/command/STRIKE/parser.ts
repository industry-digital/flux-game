import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { ActorURN } from '~/types/taxonomy';
import { StrikeCommand } from './types';

const STRIKE_VERB = 'strike';

export const strikeIntentParser: IntentParser<StrikeCommand> = (
  context: IntentParserContext,
  intent: Intent,
): StrikeCommand | undefined => {
  const { world, resolveActor } = context;

  // Check if this is a strike command
  if (intent.verb !== STRIKE_VERB) {
    return undefined;
  }

  const attacker = world.actors[intent.actor];
  if (!attacker) {
    return undefined;
  }

  // Target is optional for strike (can use current target)
  let target: ActorURN | undefined;
  const resolvedTarget = resolveActor(intent);
  if (resolvedTarget) {
    if (attacker.location !== resolvedTarget.location) {
      return undefined;
    }
    target = resolvedTarget.id;
  }

  return createActorCommand({
    id: intent.id,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    type: CommandType.STRIKE,
    args: {
      target
    },
  });
};
