import { BASE62_CHARSET, uniqid } from '~/lib/random';
import { Intent } from '~/types/handler';
import { ActorURN, PlaceURN } from '~/types/taxonomy';

export type IntentInput = {
  id: string;
  actor: ActorURN;
  location: PlaceURN;
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
  {
    timestamp,
    uniqid,
  }: IntentFactoryDependencies = DEFAULT_INTENT_FACTORY_DEPENDENCIES,
): Intent => {
  const normalized = input.text.toLowerCase().trim();
  const tokens = normalized.split(/\s+/).filter(token => token.length >= 2);
  const verb = tokens[0];

  return {
    id: input.id ?? uniqid(),
    ts: timestamp(),
    actor: input.actor,
    location: input.location,
    text: input.text,
    normalized,
    verb,
    tokens,
    uniques: new Set(tokens),
  };
};
