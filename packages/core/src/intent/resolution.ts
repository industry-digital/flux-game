import { TransformerContext, IntentParser, Intent, PureHandlerInterface, IntentParserContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';
import { createEntityResolverApi } from './resolvers';

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

/**
 * Parse raw text intent into a structured Intent object
 */
function parseRawIntent(
  text: string,
  actor: ActorURN,
  location: PlaceURN,
): Intent {
  // Simple intent parsing - extract verb and create structured intent
  const normalized = text.trim().toLowerCase();
  const tokens = normalized.split(/\s+/);
  const verb = tokens[0] || '';

  return {
    id: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ts: Date.now(),
    text: text.trim(),
    normalized,
    verb,
    tokens,
    uniques: new Set(tokens),
    actor,
    location,
  };
}

export type IntentResolutionDependencies = {
  parsers: IntentParser[];
};

export const DEFAULT_INTENT_RESOLUTION_DEPENDENCIES: IntentResolutionDependencies = {
  parsers: PARSERS,
};

/**
 * Resolve a raw text intent into a well-formed Command
 *
 * This is the main entry point for intent resolution. It:
 * 1. Parses raw text into structured Intent
 * 2. Tries each parser from PURE_GAME_LOGIC_HANDLERS until one succeeds
 * 3. Returns the first successfully parsed Command, or null if none match
 *
 * @param context - Full transformer context with world state and utilities
 * @param intentText - Raw text intent from user (e.g., "attack bob")
 * @param actorId - Actor that is issuing the intent
 * @returns Well-formed Command or null if intent couldn't be resolved
 */
export function resolveIntent(
  context: TransformerContext,
  actorId: ActorURN,
  intentText: string,
  {
    parsers,
  }: IntentResolutionDependencies = DEFAULT_INTENT_RESOLUTION_DEPENDENCIES,
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

  // Parse raw text into structured intent
  const intent = parseRawIntent(intentText, actorId, actor.location);

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
        `Parser error for intent "${intentText}": ${error instanceof Error ? error.message : String(error)}`,
        intent.id
      );
    }
  }

  // No parser could handle this intent
  context.declareError(
    `No handler found for intent: "${intentText}"`,
    intent.id
  );

  return null;
}

/**
 * Get all available parsers (for debugging/introspection)
 * Useful for tools that want to show what intents are supported
 */
export function getAvailableParsers(): IntentParser[] {
  return PARSERS;
}
