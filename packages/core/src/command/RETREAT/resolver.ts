import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { RetreatCommand, RetreatCommandArgs } from './types';
import { parseSafePositiveFloat, parseSafePositiveInteger } from '~/intent/parsing';

const RETREAT_VERB = 'retreat';
const AP = 'ap';
const DISTANCE = 'distance';
const MAX_RETREAT_ARGS: Readonly<RetreatCommandArgs> = Object.freeze({ type: 'max' });

export const retreatResolver: CommandResolver<RetreatCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): RetreatCommand | undefined => {
  // Check if this is a retreat command
  if (intent.prefix !== RETREAT_VERB) {
    return undefined;
  }

  // Parse simplified retreat syntax using zero-allocation token parsing:
  // - "retreat" → move as far as possible
  // - "retreat distance 10" → move 10 meters
  // - "retreat 15" → move 15 meters (shorthand)
  // - "retreat ap 2.5" → move using 2.5 AP

  const { tokens } = intent;
  let commandArgs: RetreatCommandArgs;

  // Single token = "retreat <number>" → distance shorthand; whole meters only so we parse as integer
  if (tokens.length === 1) {
    const value = parseSafePositiveInteger(tokens[0]);
    if (value === undefined) {
      return undefined;
    }
    commandArgs = { type: DISTANCE, distance: value };
  }

  // Two tokens = "retreat ap <number>" or "retreat distance <number>"
  else if (tokens.length === 2) {
    const [mode, valueStr] = tokens;

    if (mode === AP) {
      const value = parseSafePositiveFloat(valueStr);
      if (value === undefined) {
        return undefined;
      }
      commandArgs = { type: AP, ap: value };
    } else if (mode === DISTANCE) {
      const value = parseSafePositiveInteger(valueStr);
      if (value === undefined) {
        return undefined;
      }
      commandArgs = { type: DISTANCE, distance: value };
    }
  }

  commandArgs ??= MAX_RETREAT_ARGS;

  return createActorCommand({
    id: intent.id,
    type: CommandType.RETREAT,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: commandArgs,
  });
};
