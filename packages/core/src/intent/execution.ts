import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';
import { ActorURN } from '~/types/taxonomy';
import { resolveIntent } from './resolution';

/**
 * Cached handlers extracted from PURE_GAME_LOGIC_HANDLERS
 * Initialized once at startup for performance
 */
let cachedHandlers: PureHandlerInterface<TransformerContext, Command>[] | undefined;

/**
 * Extract handler instances from the DAG
 * Only called once - handlers are cached for subsequent use
 */
function extractHandlers(): PureHandlerInterface<TransformerContext, Command>[] {
  if (cachedHandlers !== undefined) {
    return cachedHandlers;
  }

  const handlers: PureHandlerInterface<TransformerContext, Command>[] = [];

  for (const HandlerClass of PURE_GAME_LOGIC_HANDLERS) {
    const handler = new HandlerClass();
    handlers.push(handler);
  }

  cachedHandlers = handlers;
  return handlers;
}

/**
 * Find the appropriate handler for a given command
 * Uses the handler's `handles()` method to determine compatibility
 */
function findHandler(
  command: Command
): InstanceType<typeof PURE_GAME_LOGIC_HANDLERS[number]> | null {
  for (const handler of extractHandlers()) {
    if (handler.handles(command)) {
      return handler;
    }
  }

  return null;
}

/**
 * Execute a well-formed Command through the appropriate handler
 *
 * This is the main entry point for command execution. It:
 * 1. Finds the appropriate handler using the command's type
 * 2. Validates the command structure using the handler's type guard
 * 3. Executes the command through the handler's reducer
 * 4. Returns the updated context
 *
 * @param context - Full transformer context with world state and utilities
 * @param command - Well-formed command to execute
 * @returns Updated transformer context with command effects applied
 */
export function executeCommand(
  context: TransformerContext,
  command: Command,
): TransformerContext {
  // Input validation
  if (!command) {
    context.declareError('Command is required for execution', 'command-execution');
    return context;
  }

  if (!command.type) {
    context.declareError('Command must have a type', command.id || 'command-execution');
    return context;
  }

  // Find appropriate handler
  const handler = findHandler(command);

  if (!handler) {
    context.declareError(
      `No handler found for command type: ${command.type}`,
      command.id || 'command-execution'
    );
    return context;
  }

  // Validate command structure using handler's type guard
  if (!handler.handles(command)) {
    context.declareError(
      `Command structure is invalid for type: ${(command as any).type || 'unknown'}`,
      (command as any).id || 'command-execution'
    );
    return context;
  }

  // Execute command through handler's reducer
  try {
    const updatedContext = handler.reduce(context, command);
    return updatedContext;
  } catch (error) {
    context.declareError(
      `Command execution failed for ${command.type}: ${error instanceof Error ? error.message : String(error)}`,
      command.id || 'command-execution'
    );
    return context;
  }
}


export type IntentExecutionDependencies = {
  resolveIntent: typeof resolveIntent;
};

const DEFAULT_INTENT_EXECUTION_DEPENDENCIES: IntentExecutionDependencies = {
  resolveIntent,
};

/**
 * Execute a raw text intent directly (combines resolution + execution)
 *
 * Convenience function that combines resolveIntent + executeCommand
 * Useful for simple cases where you just want to execute an intent immediately
 *
 * @param context - Full transformer context
 * @param actorId - Actor performing the intent
 * @param intentText - Raw text intent (e.g., "attack bob")
 * @returns Updated transformer context with intent effects applied
 */
export function executeIntent(
  context: TransformerContext,
  actorId: ActorURN,
  intentText: string,
  deps: IntentExecutionDependencies = DEFAULT_INTENT_EXECUTION_DEPENDENCIES,
): TransformerContext {
  const actor = context.world.actors[actorId];
  if (!actor) {
    context.declareError(`Actor not found in world projection`);
    return context;
  }

  // Resolve intent to command
  const command = deps.resolveIntent(context, actorId, intentText);

  if (!command) {
    context.declareError(`No command found for intent: ${intentText}`);
    // Error already declared in resolveIntent
    return context;
  }

  // Execute the resolved command
  return executeCommand(context, command);
}

/**
 * Get all available handlers (for debugging/introspection)
 * Useful for tools that want to show what commands are supported
 */
export function getAvailableHandlers(): Array<InstanceType<typeof PURE_GAME_LOGIC_HANDLERS[number]>> {
  return extractHandlers();
}

/**
 * Clear the handler cache (for testing or dynamic handler updates)
 * In normal operation, this should never be needed since handlers are static
 */
export function clearHandlerCache(): void {
  cachedHandlers = undefined;
}
