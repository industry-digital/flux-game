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

export type StrikeCommandArgs = {
  target?: ActorURN; // Optional target - can use current target if not specified
};

export type StrikeCommand = ActorCommand<CommandType.STRIKE, StrikeCommandArgs>;

export const strikeReducer: PureReducer<TransformerContext, StrikeCommand> = (context, command) => {
  console.log('⚔️ STRIKE REDUCER CALLED:', { actor: command.actor, target: command.args.target, session: command.session });
  const { declareError } = context;
  const { actors } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `STRIKE` actor in world projection', command.id);
    return context;
  }

  if (!actor.location) {
    declareError('`STRIKE` actor must have a location', command.id);
    return context;
  }

  // If target is specified, validate it exists and is in same location
  if (command.args.target) {
    const targetActor = actors[command.args.target];
    if (!targetActor) {
      declareError('Could not find `STRIKE` target in world projection', command.id);
      return context;
    }

    if (actor.location !== targetActor.location) {
      declareError('`STRIKE` actor and target must be in the same location', command.id);
      return context;
    }
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
    // Add target to combat if specified
    if (command.args.target) {
      addCombatant(command.args.target, Team.ALPHA);
    }
  }

  const combatantApi = useCombatant(actor.id);

  // Use the combatant API's strike method (primitive action)
  // Note: The strike method already declares events internally, so we don't need to declare them again
  combatantApi.strike(command.args.target, command.id);

  return context;
};

export const strikeIntentParser: IntentParser<StrikeCommand> = (
  context: IntentParserContext,
  intent: Intent,
): StrikeCommand | undefined => {
  const { world, resolveActor } = context;

  // Check if this is a strike command
  if (!intent.verb.startsWith('strike')) {
    return undefined;
  }

  const attacker = world.actors[intent.actor];
  if (!attacker) {
    return undefined;
  }

  // Target is optional for strike (can use current target)
  let target: ActorURN | undefined;
  const resolvedTarget = resolveActor(intent);
  if (resolvedTarget) {
    if (attacker.location !== resolvedTarget.location) {
      return undefined;
    }
    target = resolvedTarget.id;
  }

  return createActorCommand({
    trace: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.STRIKE,
    args: {
      target
    },
  });
};

export class STRIKE implements PureHandlerInterface<TransformerContext, StrikeCommand> {
  dependencies = [];
  reduce = strikeReducer;
  parse = strikeIntentParser;
  handles = (command: Command): command is StrikeCommand => {
    return isCommandOfType<CommandType.STRIKE, StrikeCommandArgs>(command, CommandType.STRIKE);
  };
}
