import { WorldEvent, WorldEventInput } from '~/types/event';
import { PotentiallyImpureOperations } from '~/types/handler';
import { uniqid as uniqidImpl, BASE62_CHARSET } from '~/lib/random';

export type CreateWorldEventDependencies = Pick<PotentiallyImpureOperations, 'timestamp' | 'uniqid'>;

export const DEFAULT_WORLD_EVENT_DEPS: CreateWorldEventDependencies = {
  timestamp: () => Date.now(),
  uniqid: () => uniqidImpl(24, BASE62_CHARSET),
};

export const createWorldEvent = <TWorldEvent extends WorldEvent = WorldEvent>(
  input: WorldEventInput,
  deps: CreateWorldEventDependencies = DEFAULT_WORLD_EVENT_DEPS,
): TWorldEvent => {
  return {
    id: deps.uniqid(),
    ts: deps.timestamp(),
    type: input.type,
    trace: input.trace,
    narrative: input.narrative,
    actor: input.actor,
    location: input.location,
    payload: input.payload,
  } as TWorldEvent;
};
