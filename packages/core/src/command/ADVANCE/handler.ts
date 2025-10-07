import {
  Intent,
  IntentParser,
  IntentParserContext,
  PureHandlerInterface,
  PureReducer,
  TransformerContext,
} from '~/types/handler';
import { CommandType, Command, ActorCommand } from '~/types/intent';
import { isCommandOfType, createActorCommand } from '~/lib/intent';
import { ActorURN } from '~/types/taxonomy';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';

export type AdvanceCommandArgs = {
  type?: 'distance' | 'ap'; // Type of advance movement
  distance?: number; // Distance to move (in meters)
  direction?: number; // Direction to move (1 = forward, -1 = backward)
  target?: ActorURN; // Target to advance toward (alternative to distance)
};

export type AdvanceCommand = ActorCommand<CommandType.ADVANCE, AdvanceCommandArgs>;

export const advanceReducer: PureReducer<TransformerContext, AdvanceCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `ADVANCE` actor in world projection', command.id);
    return context;
  }

  if (!actor.location) {
    declareError('`ADVANCE` actor must have a location', command.id);
    return context;
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
  }

  const { advance } = useCombatant(actor.id);
  const { type = 'distance', distance = 1, target } = command.args;

  advance(type, distance, target, command.id);

  return context;
};

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
    trace: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.ADVANCE,
    args: {
      type: 'distance',
      distance,
      direction: 1, // Always forward for advance
    },
  });
};

export class ADVANCE implements PureHandlerInterface<TransformerContext, AdvanceCommand> {
  dependencies = [];
  reduce = advanceReducer;
  parse = advanceIntentParser;
  handles = (command: Command): command is AdvanceCommand => {
    return isCommandOfType<CommandType.ADVANCE, AdvanceCommandArgs>(command, CommandType.ADVANCE);
  };
}
