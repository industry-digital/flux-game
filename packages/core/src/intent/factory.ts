import { BASE62_CHARSET, uniqid } from '~/lib/random';
import { Intent, IntentOptions } from '~/types/intent';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { timestamp } from '~/lib/timestamp';

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
  timestamp,
  uniqid: () => uniqid(24, BASE62_CHARSET),
};

const HYPHEN = 45;
const DOUBLE_QUOTE = 34;
const SINGLE_QUOTE = 39;
const KEYVALUE_OPTION_PARSER = /^--([^=]+)=(.*)$/;

// Strip enclosing quotes from option values
const stripQuotes = (value: string): string => {
  const len = value.length;
  if (len >= 2) {
    const first = value.charCodeAt(0);
    const last = value.charCodeAt(len - 1);
    // Check for matching single or double quotes
    if ((first === DOUBLE_QUOTE && last === DOUBLE_QUOTE) || (first === SINGLE_QUOTE && last === SINGLE_QUOTE)) { // " or '
      return value.slice(1, -1);
    }
  }
  return value;
};

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

// Tokenize text respecting quoted strings and preserving their case
const tokenize = (originalText: string, normalizedText: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let originalCurrent = '';
  let inQuotes = false;
  let quoteChar = 0;
  let tokenWasQuoted = false;

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i);
    const originalChar = originalText[i];

    if (!inQuotes && (char === DOUBLE_QUOTE || char === SINGLE_QUOTE)) {
      inQuotes = true;
      quoteChar = char;
      tokenWasQuoted = true;
      current += normalizedText[i];
      originalCurrent += originalChar;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      current += normalizedText[i];
      originalCurrent += originalChar;
      quoteChar = 0;
    } else if (!inQuotes && (char === 32 || char === 9 || char === 10 || char === 13)) { // whitespace
      if (current) {
        // Use original case for quoted strings, normalized case for everything else
        tokens.push(tokenWasQuoted ? originalCurrent : current);
        current = '';
        originalCurrent = '';
        tokenWasQuoted = false;
      }
    } else {
      current += normalizedText[i];
      originalCurrent += originalChar;
    }
  }

  if (current) {
    // Use original case for quoted strings, normalized case for everything else
    tokens.push(tokenWasQuoted ? originalCurrent : current);
  }

  return tokens;
};

// OK: flux:place:somewhere
// OK: flux:actor:alice-the-great
// OK: flux:session:combat-123
// Security: Alphanumeric with hyphens and colons to allow multi-segment URNs, prevent injection
const ACTOR_URN_REGEXP = /^flux:actor:([a-zA-Z0-9]+(?:[-:][a-zA-Z0-9]+)*)$/;
const LOCATION_URN_REGEXP = /^flux:place:([a-zA-Z0-9]+(?:[-:][a-zA-Z0-9]+)*)$/;
const SESSION_URN_REGEXP = /^flux:session:([a-zA-Z0-9]+(?:[-:][a-zA-Z0-9]+)*)$/;
const BASE62_REGEXP = /^[0-9a-zA-Z]+$/;

export function createIntent<TOptions extends IntentOptions = undefined>(
  input: IntentInput,
  deps: IntentFactoryDependencies = DEFAULT_INTENT_FACTORY_DEPENDENCIES
): Intent<TOptions> {
  if (input.ts !== undefined && (typeof input.ts !== 'number' || Number.isNaN(input.ts) || !Number.isFinite(input.ts))) {
    throw new Error('Invalid timestamp');
  }
  if (input.id !== undefined && !BASE62_REGEXP.test(input.id)) {
    throw new Error('Invalid intent ID');
  }
  if (!ACTOR_URN_REGEXP.test(input.actor)) {
    throw new Error('Invalid actor URN');
  }
  if (input.location && !LOCATION_URN_REGEXP.test(input.location)) {
    throw new Error('Invalid location URN');
  }
  if (input.session && !SESSION_URN_REGEXP.test(input.session)) {
    throw new Error('Invalid session URN');
  }

  const trimmed = input.text.trim();
  const normalized = trimmed.toLowerCase();
  const allTokens = tokenize(trimmed, normalized);

  let verb: string = '';

  const args: string[] = [];
  let options: TOptions | undefined;

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
        if (!options) options = {} as TOptions;
        (options as Record<string, any>)[optionName] = stripQuotes(optionValue);
        continue;
      }

      // Handle flags like --debug (without =value)
      const flagName = token.slice(2);
      if (flagName) {
        if (!options) options = {} as TOptions;
        (options as Record<string, any>)[flagName] = true;
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
    text: trimmed,
    normalized,
    prefix: verb,
    tokens: args,
    uniques,
    options: options as TOptions
  };
}
