import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { AdvanceCommand, AdvanceCommandArgs } from './types';
import { parseSafePositiveFloat, parseSafePositiveInteger } from '~/intent/parsing';

const ADVANCE_VERB = 'advance';
const AP = 'ap';
const DISTANCE = 'distance';
const MAX_ADVANCE_ARGS: Readonly<AdvanceCommandArgs> = Object.freeze({ type: 'max' });

export const advanceResolver: CommandResolver<AdvanceCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AdvanceCommand | undefined => {
  // Check if this is an advance command
  if (intent.prefix !== ADVANCE_VERB) {
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
    const value = parseSafePositiveInteger(tokens[0]);
    if (value !== undefined) {
      commandArgs = { type: DISTANCE, distance: value };
    }
    // If parsing fails, fall back to max advance
  }

  // Two tokens = "advance ap <number>" or "advance distance <number>"
  else if (tokens.length === 2) {
    const [mode, valueStr] = tokens;

    if (mode === AP) {
      const value = parseSafePositiveFloat(valueStr);
      if (value !== undefined) {
        commandArgs = { type: AP, ap: value };
      }
      // If parsing fails, fall back to max advance
    } else if (mode === DISTANCE) {
      const value = parseSafePositiveInteger(valueStr);
      if (value !== undefined) {
        commandArgs = { type: DISTANCE, distance: value };
      }
      // If parsing fails, fall back to max advance
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
