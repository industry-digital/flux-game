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

export type TargetCommandArgs = {
  target: ActorURN;
};

export type TargetCommand = ActorCommand<CommandType.TARGET, TargetCommandArgs>;

export const targetReducer: PureReducer<TransformerContext, TargetCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;
  const targetActor = actors[command.args.target];

  if (!targetActor) {
    declareError('Could not find `TARGET` target in world projection', command.id);
    return context;
  }

  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `TARGET` actor in world projection', command.id);
    return context;
  }

  if (actor.location !== targetActor.location) {
    declareError('`TARGET` actor and target must be in the same location', command.id);
    return context;
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
    addCombatant(targetActor.id, Team.ALPHA);
  }

  const { target } = useCombatant(actor.id);
  target(targetActor.id, command.id);

  return context;
};

export const targetIntentParser: IntentParser<TargetCommand> = (
  context: IntentParserContext,
  intent: Intent,
): TargetCommand | undefined => {
  const { world, resolveActor } = context;

  // Check if this is a target command
  if (!intent.verb.startsWith('target')) {
    return undefined;
  }

  const target = resolveActor(intent);
  if (!target) {
    return undefined;
  }

  const actor = world.actors[intent.actor];
  if (!actor) {
    return undefined;
  }

  if (actor.location !== target.location) {
    return undefined;
  }

  return createActorCommand({
    trace: intent.id,
    actor: intent.actor,
    location: intent.location,
    type: CommandType.TARGET,
    args: {
      target: target.id
    },
  });
};

export class TARGET implements PureHandlerInterface<TransformerContext, TargetCommand> {
  dependencies = [];
  reduce = targetReducer;
  parse = targetIntentParser;
  handles = (command: Command): command is TargetCommand => {
    return isCommandOfType<CommandType.TARGET, TargetCommandArgs>(command, CommandType.TARGET);
  };
}
