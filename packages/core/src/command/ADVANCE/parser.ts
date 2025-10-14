import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { AdvanceCommand } from './types';

export const advanceIntentParser: IntentParser<AdvanceCommand> = (
  context: IntentParserContext,
  intent: Intent,
): AdvanceCommand | undefined => {
  const { world } = context;

  // Check if this is an advance command
  if (!intent.verb.startsWith('advance') && !intent.verb.startsWith('forward') && !intent.verb.startsWith('move forward')) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  if (!actor.location) {
    return undefined;
  }

  // Parse distance from intent if provided
  let distance = 1; // Default advance distance
  const distanceMatch = intent.text.match(/(\d+)\s*(?:m|meter|meters)?/);
  if (distanceMatch) {
    distance = parseInt(distanceMatch[1], 10);
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.ADVANCE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      type: 'distance',
      distance,
      direction: 1, // Always forward for advance
    },
  });
};
