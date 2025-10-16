import { BASE62_CHARSET, uniqid } from '~/lib/random';
import { Intent } from '~/types/handler';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';

export type IntentInput = {
  id?: string;
  ts?: number;
  actor: ActorURN;
  location: PlaceURN;
  session?: SessionURN;
  text: string;
};

export type IntentFactoryDependencies = {
  timestamp: () => number;
  uniqid: () => string;
};

export const DEFAULT_INTENT_FACTORY_DEPENDENCIES: IntentFactoryDependencies = {
  timestamp: () => Date.now(),
  uniqid: () => uniqid(24, BASE62_CHARSET),
};

const HYPHEN = 45;
const WHITESPACE_PATTERN = /\s+/;
const KEYVALUE_OPTION_PARSER = /^--([^=]+)=(.*)$/;

// Optimized token filter - inline numeric check for better performance
const TOKEN_FILTER = (token: string): boolean => {
  const len = token.length;
  if (len >= 2) return true;

  // Fast path for single character - check if it's a digit
  if (len === 1) {
    const char = token.charCodeAt(0);
    return char >= 48 && char <= 57; // '0' to '9'
  }

  return false;
};

export function createIntent<TOptions extends Record<string, string | number | boolean> = Record<string, string | number | boolean>>(
  input: IntentInput,
  deps: IntentFactoryDependencies = DEFAULT_INTENT_FACTORY_DEPENDENCIES
): Intent & { options: TOptions } {
  const normalized = input.text.toLowerCase().trim();
  const allTokens = normalized.split(WHITESPACE_PATTERN);

  let verb: string = '';

  const args: string[] = [];
  const options: Record<string, string | number | boolean> = {};

  // Single pass through all the tokens to parse verb, options, and args.
  const tokenCount = allTokens.length;
  for (let i = 0; i < tokenCount; i++) {
    const token = allTokens[i];
    if (!TOKEN_FILTER(token)) {
      continue;
    }

    if (!verb) {
      verb = token;
      continue;
    }

    // Optimized option parsing - check length and chars directly to avoid string method calls
    if (token.length > 2 && token.charCodeAt(0) === HYPHEN && token.charCodeAt(1) === HYPHEN) { // '--'
      const match = token.match(KEYVALUE_OPTION_PARSER);
      if (match?.length === 3) {
        const [, optionName, optionValue] = match;
        options[optionName] = optionValue;
        continue;
      }

      // Handle flags like --debug (without =value)
      const flagName = token.slice(2);
      if (flagName) {
        options[flagName] = true;
        continue;
      }
    }

    // Add non-option tokens as arguments
    args.push(token);
  }

  const uniques = new Set(args);

  return {
    id: input.id ?? deps.uniqid(),
    ts: input.ts ?? deps.timestamp(),
    actor: input.actor,
    location: input.location,
    session: input.session,
    text: input.text,
    normalized,
    verb,
    args,
    uniques,
    options: options as TOptions,
  };
}
