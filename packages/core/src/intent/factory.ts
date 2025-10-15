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

const NUMERIC_TOKEN_PATTERN = /^\d+(\.\d+)?$/;
const TOKEN_FILTER = (token: string) => token.length >= 2 || NUMERIC_TOKEN_PATTERN.test(token);

export const createIntent = (
  input: IntentInput,
  deps: IntentFactoryDependencies = DEFAULT_INTENT_FACTORY_DEPENDENCIES,
): Intent => {
  const normalized = input.text.toLowerCase().trim();
  const allTokens = normalized.split(/\s+/);
  // Keep tokens that are either >= 2 chars OR are numeric (including single digits)
  const filteredTokens = allTokens.filter(TOKEN_FILTER);
  const [verb, ...tokens] = filteredTokens;

  return {
    id: input.id ?? deps.uniqid(),
    ts: input.ts ?? deps.timestamp(),
    actor: input.actor,
    location: input.location,
    session: input.session,
    text: input.text,
    normalized,
    verb,
    tokens,
    uniques: new Set(tokens),
  };
};
