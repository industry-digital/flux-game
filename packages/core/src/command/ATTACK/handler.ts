import {
  Intent,
  IntentParser,
  IntentParserContext,
  PureHandlerInterface,
  PureReducer,
  TransformerContext,
} from '~/types/handler';
import { CommandType, Command, ActorCommand } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { ActorURN } from '~/types/taxonomy';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { CombatAction, Team } from '~/types/combat';
import { generateCombatPlan } from '~/worldkit/combat/ai';

export type AttackCommandArgs = {
  target: ActorURN;
};

export type AttackCommand =ActorCommand<CommandType.ATTACK, AttackCommandArgs>;

export const attackReducer: PureReducer<TransformerContext, AttackCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;
  const targetActor = actors[command.args.target!];

  if (!targetActor) {
    declareError('Could not find `ATTACK` target in world projection', command.id);
    return context;
  }

  const actor = actors[command.actor!];

  if (!actor) {
    declareError('Could not find `ATTACK` actor in world projection', command.id);
    return context;
  }

  if (actor.location !== targetActor.location) {
    declareError('`ATTACK` actor and target must be in the same location', command.id);
    return context;
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
    addCombatant(targetActor.id, Team.ALPHA);
  }

  // TODO: Replace this logic with useIntentExecution
  const { combatant, target, attack, defend } = useCombatant(actor.id);
  const plan: CombatAction[] = generateCombatPlan(context, session, combatant, command.id);

  for (const action of plan) {
    switch (action.command) {
      case CommandType.TARGET:
        target(action.args.target, command.id);
        break;
      case CommandType.ATTACK:
        attack(targetActor.id, command.id);
        break;
      case CommandType.DEFEND:
        defend(command.id);
        break;
    }
  }

  return context;
};

export const attackIntentParser: IntentParser<AttackCommand> = (
  context: IntentParserContext,
  intent: Intent,
): AttackCommand | undefined => {
  const { world, resolveActor } = context;

  // Check if this is an attack command
  if (!intent.verb.startsWith('attack')) {
    return undefined;
  }

  const target = resolveActor(intent);
  if (!target) {
    return undefined;
  }

  const attacker = world.actors[intent.actor];
  if (!attacker) {
    return undefined;
  }

  if (attacker.location !== target.location) {
    return undefined;
  }

  return {
    __type: 'command',
    id: context.uniqid(),
    ts: context.timestamp(),
    actor: intent.actor,
    location: intent.location,
    type: CommandType.ATTACK,
    args: {
      target: target.id
    }
  };
};

export class ATTACK implements PureHandlerInterface<TransformerContext, AttackCommand> {
  dependencies = [];
  reduce = attackReducer;
  parse = attackIntentParser;
  handles = (command: Command): command is AttackCommand => {
    return isCommandOfType<CommandType.ATTACK, AttackCommandArgs>(command, CommandType.ATTACK);
  };
}
