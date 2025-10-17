import { CommandType } from '~/types/intent';
import { CombatCommand } from '~/types/combat';
import { CombatantApi } from './combatant';
import { WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';

/**
 * Given a combatant and a set of combat commands, convert the commands to calls
 * on the combatant, and return an array of WorldEvent objects. Consumers may opt-into
 * zero-allocation performance optimization.
 */
export const executeCombatPlan = (
  context: TransformerContext,
  combatant: CombatantApi,
  plan: CombatCommand[],
): TransformerContext => {
  const events: WorldEvent[] = [];

  for (const command of plan) {
    switch (command.type) {
      case CommandType.ATTACK: {
        events.push(...combatant.attack(command.args.target, command.id));
        break;
      }
      case CommandType.TARGET: {
        events.push(...combatant.target(command.args.target, command.id));
        break;
      }
      case CommandType.DEFEND: {
        events.push(...combatant.defend(command.id));
        break;
      }
      case CommandType.ADVANCE: {
        events.push(...combatant.advance('distance', command.args.distance, command.id, { autoDone: command.args.autoDone }));
        break;
      }
      case CommandType.RETREAT: {
        events.push(...combatant.retreat('distance', command.args.distance, command.id, { autoDone: command.args.autoDone }));
        break;
      }
      case CommandType.ATTACK: {
        events.push(...combatant.attack(command.args.target, command.id));
        break;
      }
      case CommandType.STRIKE: {
        events.push(...combatant.strike(command.args.target, command.id));
        break;
      }
      case CommandType.CLEAVE: {
        events.push(...combatant.cleave(command.id));
        break;
      }
    }
  }

  for (const event of events) {
    context.declareEvent(event);
  }

  return context;
};
