/**
 * Combat Intent Execution Engine
 *
 * Bridges the intent parsing system with the combat execution engine.
 * Converts CombatAction[] objects into actual combat operations via useCombatant hooks.
 */

import { Actor } from '~/types/entity/actor';
import { CombatAction, CombatSession } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { WorldEvent } from '~/types/event';
import { CombatantApi, MOVE_BY_AP, MOVE_BY_DISTANCE, MovementType } from '~/worldkit/combat/combatant';
import { evaluateCombatIntent, CombatIntentContext, CombatIntentResult } from './intent';

/**
 * Interface for the intent execution engine
 */
export interface IntentExecutionApi {
  /** Execute a list of combat actions and return resulting events */
  executeActions: (actions: CombatAction[], trace?: string) => WorldEvent[];

  /** Execute natural language intent and return resulting events */
  executeIntent: (input: string, trace?: string) => WorldEvent[];

  /** Check if the combatant can advance the turn and return resulting events */
  checkAndAdvanceTurn: (trace?: string) => WorldEvent[];
}

/**
 * Error thrown when action execution fails
 */
export class ActionExecutionError extends Error {
  constructor(
    message: string,
    public readonly action: CombatAction,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ActionExecutionError';
  }
}

/**
 * Extract movement primitives from action args for zero-allocation calls
 */
function extractMovementPrimitives(args: any): { by: MovementType; value: number; target?: ActorURN } {
  // Determine movement type based on explicit type or available properties
  let by: MovementType;
  let value: number;

  if (args.type === MOVE_BY_AP) {
    by = MOVE_BY_AP;
    value = args.ap || args.amount || args.value;
  } else if (args.type === MOVE_BY_DISTANCE) {
    by = MOVE_BY_DISTANCE;
    value = args.distance || args.value;
  } else if (args.ap !== undefined || args.amount !== undefined) {
    // Fallback: if no explicit type but AP/amount is specified
    by = MOVE_BY_AP;
    value = args.ap || args.amount || args.value;
  } else {
    // Fallback: default to distance-based movement
    by = MOVE_BY_DISTANCE;
    value = args.distance || args.value;
  }

  const target = args.target as ActorURN | undefined;

  // Validate that we have a valid value
  if (value === undefined || value === null || isNaN(value)) {
    throw new Error('Invalid movement arguments: must specify either distance or ap');
  }

  return { by, value, target };
}

/**
 * Maps a CombatAction to the appropriate combatant hook method call
 */
function executeSingleAction(
  action: CombatAction,
  combatantHook: CombatantApi,
  trace: string,
): WorldEvent[] {
  try {
    switch (action.command) {
      case CommandType.TARGET: {
        const targetId = action.args.target as ActorURN;
        if (!targetId) {
          throw new Error('TARGET action requires target argument');
        }
        return combatantHook.target(targetId, trace);
      }

      case CommandType.ATTACK: {
        const targetId = action.args.target as ActorURN | undefined;
        return combatantHook.attack(targetId, trace);
      }

      case CommandType.DEFEND: {
        return combatantHook.defend(trace, action.args);
      }

      case CommandType.STRIKE: {
        const targetId = action.args.target as ActorURN | undefined;
        return combatantHook.strike(targetId, trace);
      }

      case CommandType.MOVE: {
        const { by, value, target } = extractMovementPrimitives(action.args);
        const isRetreat = action.args.direction === 'retreat' || action.args.retreat === true;

        return isRetreat
          ? combatantHook.retreat(by, value, target, trace)
          : combatantHook.advance(by, value, target, trace);
      }

      case CommandType.ADVANCE: {
        const { by, value, target } = extractMovementPrimitives(action.args);
        return combatantHook.advance(by, value, target, trace);
      }

      case CommandType.RETREAT: {
        const { by, value, target } = extractMovementPrimitives(action.args);
        return combatantHook.retreat(by, value, target, trace);
      }

      default:
        throw new Error(`Unsupported command type: ${action.command}`);
    }
  } catch (error) {
    throw new ActionExecutionError(
      `Failed to execute ${action.command} action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      action,
      error instanceof Error ? error : undefined
    );
  }
}


/**
 * Builds combat intent context from current session state
 */
function buildIntentContext(
  context: TransformerContext,
  session: CombatSession,
  currentActor: Actor
): CombatIntentContext {
  // Get all other actors in the session as available targets
  const availableTargets: Actor[] = [];

  for (const [actorId] of session.data.combatants) {
    if (actorId !== currentActor.id) {
      const actor = context.world.actors[actorId];
      if (actor) {
        availableTargets.push(actor);
      }
    }
  }

  return {
    currentActor,
    availableTargets,
    session,
    computeActorMass: context.mass.computeActorMass,
    getEquippedWeaponSchema: context.equipmentApi.getEquippedWeaponSchema
  };
}

export type IntentExecutionApiDependencies = {
  evaluateCombatIntent: typeof evaluateCombatIntent;
  executeSingleAction: typeof executeSingleAction;
  buildIntentContext: typeof buildIntentContext;
}

export const DEFAULT_INTENT_EXECUTION_API_DEPS: IntentExecutionApiDependencies = {
  evaluateCombatIntent,
  executeSingleAction,
  buildIntentContext,
};

/**
 * Creates an intent executor for a specific combatant hook
 */
export function createIntentExecutionApi(
  context: TransformerContext,
  session: CombatSession,
  combatantHook: CombatantApi,
  deps: IntentExecutionApiDependencies = DEFAULT_INTENT_EXECUTION_API_DEPS,
): IntentExecutionApi {
  const actor = context.world.actors[combatantHook.combatant.actorId];
  if (!actor) {
    throw new Error(`Actor ${combatantHook.combatant.actorId} not found`);
  }

  const executeActions = (actions: CombatAction[], trace: string = context.uniqid()): WorldEvent[] => {
    const allEvents: WorldEvent[] = [];

    for (const action of actions) {
      allEvents.push(...deps.executeSingleAction(action, combatantHook, trace));
    }

    // After executing all actions, check if turn should advance
    // This handles cases where actions consume all AP (like defend)
    if (!combatantHook.canAct()) {
      // Use the existing done method from the combatant hook
      // This already has the proper turn advancement logic configured
      allEvents.push(...combatantHook.done(trace));
    }

    return allEvents;
  };

  const executeIntent = (input: string, trace: string = context.uniqid()): WorldEvent[] => {

    // Build fresh context for intent parsing
    const intentContext = deps.buildIntentContext(context, session, actor);

    // Parse the natural language input
    const intentResult: CombatIntentResult = deps.evaluateCombatIntent(input, intentContext);

    if (!intentResult.success) {
      throw new Error(`Intent parsing failed: ${intentResult.error}`);
    }

    // Execute the parsed actions with the intent-specific trace
    return executeActions(intentResult.actions, trace);
  };

  const checkAndAdvanceTurn = (trace?: string): WorldEvent[] => {
    // If the combatant cannot act, automatically advance the turn
    if (!combatantHook.canAct()) {
      // Use the existing done method from the combatant hook
      return combatantHook.done(trace || context.uniqid());
    }

    // Combatant can still act, no turn advancement needed
    return [];
  };

  return {
    executeActions,
    executeIntent,
    checkAndAdvanceTurn,
  };
}
