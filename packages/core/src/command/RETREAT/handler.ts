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
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';
import { ActorURN } from '~/types/taxonomy';

export type RetreatCommandArgs = {
  type?: 'distance' | 'ap'; // Type of retreat movement
  distance?: number; // Distance to move (in meters)
  direction?: number; // Direction to move (always -1 for retreat)
  target?: ActorURN; // Target to retreat from (alternative to distance)
};

export type RetreatCommand = ActorCommand<CommandType.RETREAT, RetreatCommandArgs>;

export const retreatReducer: PureReducer<TransformerContext, RetreatCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `RETREAT` actor in world projection', command.id);
    return context;
  }

  if (!actor.location) {
    declareError('`RETREAT` actor must have a location', command.id);
    return context;
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
  }

  const { retreat } = useCombatant(actor.id);
  const { type = 'distance', distance = 1, target } = command.args;

  retreat(type, distance, target, command.id);

  return context;
};

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
    trace: intent.id,
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

export class RETREAT implements PureHandlerInterface<TransformerContext, RetreatCommand> {
  dependencies = [];
  reduce = retreatReducer;
  parse = retreatIntentParser;
  handles = (command: Command): command is RetreatCommand => {
    return isCommandOfType<CommandType.RETREAT, RetreatCommandArgs>(command, CommandType.RETREAT);
  };
}
