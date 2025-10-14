import {
  Intent,
  IntentParser,
  IntentParserContext,
} from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { RetreatCommand } from './types';

export const retreatIntentParser: IntentParser<RetreatCommand> = (
  context: IntentParserContext,
  intent: Intent,
): RetreatCommand | undefined => {
  const { world } = context;

  // Check if this is a retreat command
  if (!intent.verb.startsWith('retreat') && !intent.verb.startsWith('back') && !intent.verb.startsWith('move back')) {
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
  let distance = 1; // Default retreat distance
  const distanceMatch = intent.text.match(/(\d+)\s*(?:m|meter|meters)?/);
  if (distanceMatch) {
    distance = parseInt(distanceMatch[1], 10);
  }

  return createActorCommand({
    id: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.RETREAT,
    args: {
      type: 'distance',
      distance,
      direction: -1, // Always backward for retreat
    },
  });
};
