import { WorldEvent, WorldEventInput } from '~/types/event';
import { PotentiallyImpureOperations } from '~/types/handler';
import { uniqid as uniqidImpl, BASE62_CHARSET } from '~/lib/random';

export type CreateWorldEventDependencies = Pick<PotentiallyImpureOperations, 'timestamp' | 'uniqid'>;

export const DEFAULT_WORLD_EVENT_DEPS: CreateWorldEventDependencies = {
  timestamp: () => Date.now(),
  uniqid: () => uniqidImpl(16, BASE62_CHARSET),
};

export const createWorldEvent = (
  input: WorldEvent | WorldEventInput,
  deps: CreateWorldEventDependencies = DEFAULT_WORLD_EVENT_DEPS,
): WorldEvent => {
  return {
    id: deps.uniqid(),
    ts: deps.timestamp(),
    type: input.type,
    trace: input.trace,
    narrative: input.narrative ?? { observer: '' },
    actor: input.actor,
    location: input.location,
    payload: input.payload,
  };
};
