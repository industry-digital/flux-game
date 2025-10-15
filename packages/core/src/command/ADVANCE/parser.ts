import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { AdvanceCommand } from './types';

const ADVANCE_VERB = 'advance';
const AP = 'ap';
const DISTANCE = 'distance';

export const advanceIntentParser: IntentParser<AdvanceCommand> = (
  context: IntentParserContext,
  intent: Intent,
): AdvanceCommand | undefined => {
  const { world } = context;

  // Check if this is an advance command
  if (intent.verb !== ADVANCE_VERB) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  if (!actor.location) {
    return undefined;
  }

  // Parse simplified advance syntax using zero-allocation token parsing:
  // - "advance" → move as far as possible
  // - "advance distance 10" → move 10 meters
  // - "advance 15" → move 15 meters (shorthand)
  // - "advance ap 2.5" → move using 2.5 AP

  let type: typeof DISTANCE | typeof AP = DISTANCE;
  let distance: number | undefined = undefined; // undefined = max possible

  const { tokens } = intent;

  // No tokens = "advance" only → max advance
  if (tokens.length === 0) {
    // distance remains undefined for max advance
  }
  // Single token = "advance <number>" → distance shorthand
  else if (tokens.length === 1) {
    const value = parseFloat(tokens[0]);
    if (!isNaN(value) && value > 0) {
      type = DISTANCE;
      distance = value;
    }
  }
  // Two tokens = "advance ap <number>" or "advance distance <number>"
  else if (tokens.length === 2) {
    const [modifier, valueStr] = tokens;
    const value = parseFloat(valueStr);

    if (!isNaN(value) && value > 0) {
      if (modifier === AP) {
        type = AP;
        distance = value;
      } else if (modifier === DISTANCE) {
        type = DISTANCE;
        distance = Math.floor(value); // Distance must be whole meters
      }
    }
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.ADVANCE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      type,
      distance, // undefined means "move as far as possible"
      direction: 1, // Always forward for advance
    },
  });
};
