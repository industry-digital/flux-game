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

export type DefendCommandArgs = {
  autoDone?: boolean; // Whether this is an auto-generated defend to end turn
};

export type DefendCommand = ActorCommand<CommandType.DEFEND, DefendCommandArgs>;

export const defendReducer: PureReducer<TransformerContext, DefendCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `DEFEND` actor in world projection', command.id);
    return context;
  }

  if (!actor.location) {
    declareError('`DEFEND` actor must have a location', command.id);
    return context;
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
  }

  const { defend } = useCombatant(actor.id);
  defend(command.id);

  return context;
};

export const defendIntentParser: IntentParser<DefendCommand> = (
  context: IntentParserContext,
  intent: Intent,
): DefendCommand | undefined => {
  const { world } = context;

  // Check if this is a defend command
  if (!intent.verb.startsWith('defend')) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  if (!actor.location) {
    return undefined;
  }

  return createActorCommand({
    trace: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.DEFEND,
    args: {
      autoDone: false // User-initiated defend, not auto-generated
    },
  });
};

export class DEFEND implements PureHandlerInterface<TransformerContext, DefendCommand> {
  dependencies = [];
  reduce = defendReducer;
  parse = defendIntentParser;
  handles = (command: Command): command is DefendCommand => {
    return isCommandOfType<CommandType.DEFEND, DefendCommandArgs>(command, CommandType.DEFEND);
  };
}
