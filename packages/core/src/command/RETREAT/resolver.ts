import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { RetreatCommand, RetreatCommandArgs } from './types';

const RETREAT_VERB = 'retreat';
const AP = 'ap';
const DISTANCE = 'distance';
const MAX_RETREAT_ARGS: Readonly<RetreatCommandArgs> = Object.freeze({ type: 'max' });

export const retreatResolver: CommandResolver<RetreatCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): RetreatCommand | undefined => {
  const { world } = context;

  // Check if this is a retreat command
  if (intent.verb !== RETREAT_VERB) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  if (!actor.location) {
    return undefined;
  }

  // Parse simplified retreat syntax using zero-allocation token parsing:
  // - "retreat" → move as far as possible
  // - "retreat distance 10" → move 10 meters
  // - "retreat 15" → move 15 meters (shorthand)
  // - "retreat ap 2.5" → move using 2.5 AP

  const { tokens } = intent;
  let commandArgs: RetreatCommandArgs;

  // Single token = "retreat <number>" → distance shorthand
  if (tokens.length === 1) {
    const value = parseInt(tokens[0], 10);
    if (!isNaN(value) && value > 0 && Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER) {
      commandArgs = { type: 'distance', distance: value };
    }
  }

  // Two tokens = "retreat ap <number>" or "retreat distance <number>"
  else if (tokens.length === 2) {
    const [modifier, valueStr] = tokens;
    const value = parseFloat(valueStr);

    if (!isNaN(value) && value > 0 && Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER) {
      if (modifier === AP) {
        commandArgs = { type: 'ap', ap: value };
      } else if (modifier === DISTANCE) {
        commandArgs = { type: 'distance', distance: Math.floor(value) }; // Distance must be whole meters
      }
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
