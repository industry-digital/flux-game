import { TransformerContext, PureHandlerInterface } from '~/types/handler';
import { Command, Intent } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';
import { createIntent } from './factory';
import { CommandResolver, CommandResolverContext } from '~/types/intent';
import { ErrorCode } from '~/types/error';

const RESOLVERS: CommandResolver[] = (() => {
  const resolvers: CommandResolver[] = [];

  for (const HandlerClass of PURE_GAME_LOGIC_HANDLERS) {
    const handler = new HandlerClass() as PureHandlerInterface<TransformerContext, any>;
    const resolver = handler.resolve; // ASSUMPTION: No need to bind() to handler
    if (resolver) {
      resolvers.push(resolver);
    }
  }

  return resolvers;
})();

// No-op
const DEFAULT_DECLARE_ERROR = (message: ErrorCode, trace?: string) => {};

export const createCommandResolverContext = (
  declareError: (message: ErrorCode, trace?: string) => void = DEFAULT_DECLARE_ERROR,
  log?: any,
): CommandResolverContext => {
  const failed = (trace: string, code: ErrorCode) => {
    declareError(code, trace);
    log?.error(code, trace);
  };
  return { failed, declareError };
};

export type CommandResolutionDependencies = {
  resolvers: CommandResolver[];
};

export const DEFAULT_COMMAND_RESOLUTION_DEPENDENCIES: CommandResolutionDependencies = {
  resolvers: RESOLVERS,
};

/**
 * Resolve a well-formed Intent into a Command
 *
 * This is the core resolution logic extracted from the old resolveIntent function.
 * Takes a pre-formed Intent object and attempts to parse it into a Command.
 *
 * @param context - Full transformer context with world state and utilities
 * @param intent - Well-formed Intent object to resolve
 * @returns Well-formed Command or null if intent couldn't be resolved
 */
export function resolveCommandFromIntent(
  context: CommandResolverContext,
  intent: Intent,
  {
    resolvers,
  }: CommandResolutionDependencies = DEFAULT_COMMAND_RESOLUTION_DEPENDENCIES,
): Command | null {
  // Try each parser until one succeeds
  for (const resolveCommand of resolvers) {
    const command = resolveCommand(context, intent);
    if (command) {
      return command;
    }
  }

  return null;
}

/**
 * Resolve a raw text intent into a well-formed Command
 *
 * @deprecated Use the 3-step pipeline instead: createIntent → resolveCommandFromIntent → executeCommand
 *
 * Legacy function that combines text parsing and command resolution.
 * New code should use the explicit 3-step pipeline for better session threading.
 *
 * @param context - Full transformer context with world state and utilities
 * @param actorId - Actor that is issuing the intent
 * @param intentText - Raw text intent from user (e.g., "attack bob")
 * @returns Well-formed Command or null if intent couldn't be resolved
 */
export function resolveIntent(
  context: TransformerContext,
  actorId: ActorURN,
  intentText: string,
  deps: CommandResolutionDependencies = DEFAULT_COMMAND_RESOLUTION_DEPENDENCIES,
): Command | null {
  const actor = context.world.actors[actorId];
  if (!actor) {
    context.declareError(`Actor not found in world projection`);
    return null;
  }

  // Input validation
  if (!intentText || !intentText.trim()) {
    context.declareError('Intent text cannot be empty', 'intent-resolution');
    return null;
  }

  if (!actorId) {
    context.declareError('Actor is required for intent resolution', 'intent-resolution');
    return null;
  }

  // Parse raw text into structured intent (without session context)
  const intent = createIntent({
    id: context.uniqid(),
    actor: actorId,
    location: actor.location,
    text: intentText,
  });

  // Use the new resolution function
  return resolveCommandFromIntent(context, intent, deps);
}

/**
 * Get all available parsers (for debugging/introspection)
 * Useful for tools that want to show what intents are supported
 */
export function getAvailableParsers(): CommandResolver[] {
  return RESOLVERS;
}
