import { BASE62_CHARSET, uniqid } from '~/lib/random';
import { Intent } from '~/types/handler';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';

export type IntentInput = {
  id: string;
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

export const createIntent = (
  input: IntentInput,
  deps: IntentFactoryDependencies = DEFAULT_INTENT_FACTORY_DEPENDENCIES,
): Intent => {
  const normalized = input.text.toLowerCase().trim();
  const allTokens = normalized.split(/\s+/);
  const filteredTokens = allTokens.filter(token => token.length >= 2);
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
