import { BASE62_CHARSET, uniqid } from '~/lib/random';
import { ActorURN, PlaceURN } from '~/types/taxonomy';

export type IntentFactoryDependencies = {
  timestamp: () => number;
  uniqid: () => string;
};

export const DEFAULT_INTENT_FACTORY_DEPENDENCIES: IntentFactoryDependencies = {
  timestamp: () => Date.now(),
  uniqid: () => uniqid(24, BASE62_CHARSET),
};

export const createIntent = (
  actor: ActorURN,
  location: PlaceURN,
  text: string,
  {
    timestamp,
    uniqid,
  }: IntentFactoryDependencies = DEFAULT_INTENT_FACTORY_DEPENDENCIES,
) => {
  return {
    id: uniqid(),
    ts: timestamp(),
    actor,
    location,
    text,
  };
};
