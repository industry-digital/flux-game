import { TransformerContext, PureHandlerInterface } from '~/types/handler';
import { Command, Intent } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';
import { createEntityResolverApi } from './resolvers';
import { createIntent } from './factory';
import { CommandResolver, CommandResolverContext } from '~/types/intent';

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

export const createCommandResolverContext = (input: TransformerContext): CommandResolverContext => {
  const resolvers = createEntityResolverApi(input.world);
  return {
    ...input,
    ...resolvers,
    world: input.world,
    uniqid: input.uniqid,
    timestamp: input.timestamp,
  };
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
  context: TransformerContext,
  intent: Intent,
  {
    resolvers,
  }: CommandResolutionDependencies = DEFAULT_COMMAND_RESOLUTION_DEPENDENCIES,
): Command | null {
  // Create parser context
  const resolverContext = createCommandResolverContext(context);

  // Try each parser until one succeeds
  for (const resolver of resolvers) {
    try {
      const command = resolver(resolverContext, intent);
      if (command) {
        // Successfully resolved - return the command
        return command;
      }
    } catch (error) {
      // Parser threw an error - log it but continue trying other parsers
      context.declareError(
        `Parser error for intent "${intent.text}": ${error instanceof Error ? error.message : String(error)}`,
        intent.id
      );
    }
  }

  // No parser could handle this intent
  context.declareError(
    `No handler found for intent: "${intent.text}"`,
    intent.id
  );

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
    id: `legacy-intent-${Date.now()}`,
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
