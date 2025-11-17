import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { AdvanceCommand, AdvanceCommandArgs } from './types';

const ADVANCE_VERB = 'advance';
const AP = 'ap';
const DISTANCE = 'distance';
const MAX_ADVANCE_ARGS: Readonly<AdvanceCommandArgs> = Object.freeze({ type: 'max' });

export const advanceResolver: CommandResolver<AdvanceCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AdvanceCommand | undefined => {
  const { world } = context;

  // Check if this is an advance command
  if (intent.prefix !== ADVANCE_VERB) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  if (!actor.location) {
    return undefined;
  }

  // Parse simplified advance syntax:
  // - "advance" → move as far as possible
  // - "advance distance 10" → move 10 meters
  // - "advance 15" → move 15 meters (shorthand)
  // - "advance ap 2.5" → move using 2.5 AP

  const { tokens } = intent;
  let commandArgs: AdvanceCommandArgs;

  // Single token = "advance <number>" → distance shorthand
  if (tokens.length === 1) {
    const value = parseInt(tokens[0], 10);
    if (!isNaN(value) && value > 0 && Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER) {
      commandArgs = { type: DISTANCE, distance: value };
    }
  }

  // Two tokens = "advance ap <number>" or "advance distance <number>"
  else if (tokens.length === 2) {
    const [modifier, valueStr] = tokens;
    const value = parseFloat(valueStr);

    if (!isNaN(value) && value > 0 && Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER) {
      if (modifier === AP) {
        commandArgs = { type: AP, ap: value };
      } else if (modifier === DISTANCE) {
        commandArgs = { type: DISTANCE, distance: Math.floor(value) }; // Distance must be whole meters
      }
    }
  }

  commandArgs ??= MAX_ADVANCE_ARGS;

  return createActorCommand({
    id: intent.id,
    type: CommandType.ADVANCE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: commandArgs,
  });
};
