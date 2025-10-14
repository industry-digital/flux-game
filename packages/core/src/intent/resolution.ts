import { TransformerContext, IntentParser, Intent, PureHandlerInterface, IntentParserContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';
import { createEntityResolverApi } from './resolvers';
import { createIntent } from './factory';

const PARSERS: IntentParser[] = (() => {
  const parsers: IntentParser[] = [];

  for (const HandlerClass of PURE_GAME_LOGIC_HANDLERS) {
    const handler = new HandlerClass() as PureHandlerInterface<TransformerContext, any>;
    const parser = handler.parse; // ASSUMPTION: No need to bind() to handler
    if (parser) {
      parsers.push(parser);
    }
  }

  return parsers;
})();

export const createIntentParserContext = (input: TransformerContext): IntentParserContext => {
  const resolvers = createEntityResolverApi(input.world);
  return {
    ...input,
    ...resolvers,
    world: input.world,
    uniqid: input.uniqid,
    timestamp: input.timestamp,
  };
};


export type IntentResolutionDependencies = {
  parsers: IntentParser[];
};

export const DEFAULT_INTENT_RESOLUTION_DEPENDENCIES: IntentResolutionDependencies = {
  parsers: PARSERS,
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
    parsers,
  }: IntentResolutionDependencies = DEFAULT_INTENT_RESOLUTION_DEPENDENCIES,
): Command | null {
  // Create parser context
  const parserContext = createIntentParserContext(context);

  // Try each parser until one succeeds
  for (const parser of parsers) {
    try {
      const command = parser(parserContext, intent);
      if (command) {
        // Successfully parsed - return the command
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
  deps: IntentResolutionDependencies = DEFAULT_INTENT_RESOLUTION_DEPENDENCIES,
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
export function getAvailableParsers(): IntentParser[] {
  return PARSERS;
}
