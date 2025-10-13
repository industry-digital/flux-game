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

export type CleaveCommandArgs = {
  // CLEAVE has no arguments - it automatically targets all enemies at optimal range
};

export type CleaveCommand = ActorCommand<CommandType.CLEAVE, CleaveCommandArgs>;

export const cleaveReducer: PureReducer<TransformerContext, CleaveCommand> = (context, command) => {
  console.log('🗡️ CLEAVE REDUCER CALLED:', { actor: command.actor, session: command.session });
  const { declareError } = context;
  const { actors } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `CLEAVE` actor in world projection', command.id);
    return context;
  }

  if (!actor.location) {
    declareError('`CLEAVE` actor must have a location', command.id);
    return context;
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
    // Note: CLEAVE doesn't pre-add targets since it discovers them dynamically
    // The cleave action will handle adding any enemies it finds to combat
  }

  const combatantApi = useCombatant(actor.id);

  // Use the combatant API's cleave method (primitive multi-target action)
  const events = combatantApi.cleave(command.id);

  // Declare all events through the context
  for (const event of events) {
    context.declareEvent(event);
  }

  return context;
};

export const cleaveIntentParser: IntentParser<CleaveCommand> = (
  context: IntentParserContext,
  intent: Intent,
): CleaveCommand | undefined => {
  const { world } = context;

  // Check if this is a cleave command
  if (!intent.verb.startsWith('cleave')) {
    return undefined;
  }

  const attacker = world.actors[intent.actor];
  if (!attacker) {
    return undefined;
  }

  if (!attacker.location) {
    return undefined;
  }

  return createActorCommand({
    trace: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.CLEAVE,
    args: {
      // No arguments needed for cleave
    },
  });
};

export class CLEAVE implements PureHandlerInterface<TransformerContext, CleaveCommand> {
  dependencies = [];
  reduce = cleaveReducer;
  parse = cleaveIntentParser;
  handles = (command: Command): command is CleaveCommand => {
    return isCommandOfType<CommandType.CLEAVE, CleaveCommandArgs>(command, CommandType.CLEAVE);
  };
}
