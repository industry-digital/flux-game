import { Actor } from '~/types/entity/actor';
import { CombatSession, generateCombatPlan } from '~/worldkit/combat';
import { ActionCost, CombatCommand, Combatant } from '~/types/combat';
import { WorldEvent } from '~/types/event';
import { createStrikeMethod } from '~/worldkit/combat/action/strike';
import { ActorURN } from '~/types/taxonomy';
import { CommandType } from '~/types/intent';
import { createDefendMethod } from '~/worldkit/combat/action/defend';
import { createDoneMethod } from '~/worldkit/combat/action/done';
import { createTargetMethod } from '~/worldkit/combat/action/target';
import { CombatantApi, MOVE_BY_AP, MOVE_BY_DISTANCE } from '~/worldkit/combat/combatant';
import { createAdvanceMethod } from '~/worldkit/combat/action/advance';
import { createRetreatMethod } from '~/worldkit/combat/action/retreat';
import { TransformerContext } from '~/types/handler';
import { createZeroCost } from '~/worldkit/combat/tactical-cost';

// Attack is a zero-cost facade - actual costs are in the underlying actions
export const ATTACK_COST: Readonly<ActionCost> = createZeroCost();

/**
 * Combat actions needed for plan execution
 */
export type CombatPlanDependencies = Pick<CombatantApi, 'strike' | 'defend' | 'target' | 'advance' | 'retreat' | 'done'>;

/**
 * Function signature for executing a combat plan
 */
export type CombatPlanExecutor = (
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  plan: CombatCommand[],
  trace: string,
  deps: CombatPlanDependencies
) => WorldEvent[];

export type AttackDependencies = {
  generateCombatPlan?: typeof generateCombatPlan;
  executeCombatPlan?: CombatPlanExecutor;
  target?: ReturnType<typeof createTargetMethod>;
  strike?: ReturnType<typeof createStrikeMethod>;
  defend?: ReturnType<typeof createDefendMethod>;
  advance?: ReturnType<typeof createAdvanceMethod>;
  retreat?: ReturnType<typeof createRetreatMethod>;
  done?: ReturnType<typeof createDoneMethod>;
};

const internalExecuteCombatPlan: CombatPlanExecutor = (
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  plan: CombatCommand[],
  trace: string,
  deps: CombatPlanDependencies
): WorldEvent[] => {
  const { searchCache } = context;
  const allEvents: WorldEvent[] = [];

  // Execute each action in the plan sequentially
  for (let i = 0; i < plan.length; i++) {
    const action = plan[i];
    let actionEvents: WorldEvent[] = [];

    // Route action by command type - big inlined switch
    switch (action.type) {
      case CommandType.ATTACK: //--> This should never happen, but if we get it, we treat it like a STRIKE
      case CommandType.STRIKE:
        // Handle explicit target assignment if provided
        if (action.args?.target) {
          const targetEvents = deps.target(action.args.target, trace);
          actionEvents.push(...targetEvents);
        }

        // Direct strike action - use target from action args or combatant's current target
        const strikeTarget = action.args?.target || combatant.target;
        if (strikeTarget) {
          const strikeEvents = deps.strike(strikeTarget, trace);
          actionEvents.push(...strikeEvents);
        } else {
          context.declareError('Strike action requires a target', trace);
        }
        break;

      case CommandType.DEFEND:
        // Defensive action - pass through autoDone option from command args
        const defendOptions = action.args ? { autoDone: action.args.autoDone } : undefined;
        actionEvents = deps.defend(trace, defendOptions);
        break;

      case CommandType.TARGET:
        // Target acquisition - update combatant's target
        if (action.args?.target) {
          actionEvents = deps.target(action.args.target, trace);
        } else {
          context.declareError('Target action requires a target argument', trace);
        }
        break;

      case CommandType.ADVANCE:
        // Zero-allocation advance: extract primitives directly from args
        const by = action.args.type === 'ap' ? MOVE_BY_AP : MOVE_BY_DISTANCE;
        const value = by === MOVE_BY_DISTANCE
          ? (action.args.distance || action.args.value)
          : (action.args.ap || action.args.amount || action.args.value);

        if (!value || value <= 0) {
          context.declareError('ADVANCE action requires positive distance or ap argument', trace);
        } else {
          actionEvents = deps.advance(by, value, trace, { autoDone: action.args.autoDone });
        }
        break;

      case CommandType.RETREAT: {
        const by = (action.args.type === 'ap' ? MOVE_BY_AP : MOVE_BY_DISTANCE);

        const value = (by === MOVE_BY_DISTANCE)
          ? (action.args.distance || action.args.value)
          : (action.args.ap || action.args.amount || action.args.value);

        actionEvents = deps.retreat(by, value, trace, { autoDone: action.args.autoDone });
        break;
      }

      case CommandType.DASH:
      case CommandType.CHARGE:
        // Movement actions not yet supported in combat plans
        context.declareError(`Movement action ${action.type} not yet supported in AI combat plans`, trace);
        break;

      default:
        // Unsupported action type
        context.declareError(`Unsupported action in combat plan: ${action.type}`, trace);
        break;
    }

    // Accumulate events from this action
    allEvents.push(...actionEvents);

    // Note: No AP exhaustion check here - individual actions validate their own AP costs
    // This allows 0-cost plan-ending actions (like DEFEND with autoDone) to execute properly
  }

  // Turn ending is handled by individual actions (e.g., DEFEND with autoDone: true)
  // or when the actor runs out of AP during plan execution
  return allEvents;
};

const DEFAULT_ATTACK_DEPS: Readonly<AttackDependencies> = {
  generateCombatPlan,
  executeCombatPlan: internalExecuteCombatPlan,
};

export function createAttackMethod (
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: AttackDependencies = DEFAULT_ATTACK_DEPS,
) {
  const {
    generateCombatPlan: generateCombatPlanImpl = generateCombatPlan,
    executeCombatPlan: executeCombatPlanImpl = internalExecuteCombatPlan,
    target: targetImpl = deps.target || createTargetMethod(context, session, actor, combatant),
    strike: strikeImpl = deps.strike || createStrikeMethod(context, session, actor, combatant),
    defend: defendImpl = deps.defend || (() => { throw new Error('defend method is required for attack action'); }),
    advance: advanceImpl = deps.advance || createAdvanceMethod(context, session, actor, combatant),
    retreat: retreatImpl = deps.retreat || createRetreatMethod(context, session, actor, combatant),
    done: doneImpl = deps.done || (() => { throw new Error('done method is required for attack action'); }),
  } = deps;

  return (target?: ActorURN, trace: string = context.uniqid()): WorldEvent[] => {
    const { declareError } = context;
    const allEvents: WorldEvent[] = [];

    // Handle target parameter - update persistent target if provided
    if (target) {
      const targetEvents = targetImpl(target, trace);
      allEvents.push(...targetEvents);
    }

    // Require existing target if none provided
    if (!combatant.target) {
      declareError(
        'No target selected. Use "target <name>" or "attack <name>" to select a target first.',
        trace
      );
      return allEvents;
    }

    // Generate AI combat plan
    const plan = generateCombatPlanImpl(context, session, combatant, trace);

    if (plan.length === 0) {
      declareError('Unable to generate combat plan. No valid actions available.', trace);
      return allEvents;
    }

    // Execute the AI plan using injected executor
    const planEvents = executeCombatPlanImpl(context, session, actor, combatant, plan, trace, {
      strike: strikeImpl,
      defend: defendImpl,
      target: targetImpl,
      advance: advanceImpl,
      retreat: retreatImpl,
      done: doneImpl,
    });

    allEvents.push(...planEvents);

    return allEvents;
  };
}
