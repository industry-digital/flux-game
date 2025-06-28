import { ActorDidMove, ActorDidArrive, PlaceURN, ActorDidDepart, EventType } from '@flux';
import { uniqid } from '~/lib/random';

export const createActorDidDepartEvent = (input: ActorDidMove): ActorDidDepart => {
  const origin: PlaceURN = input.location;
  const destination: PlaceURN = input.payload!.destination;

  return {
    id: uniqid(8),
    ts: input.ts,
    trace: input.trace,
    type: EventType.ACTOR_DID_LEAVE,
    actor: input.actor,
    location: origin,
    payload: { destination },
  };
};

export const createActorDidArriveEvent = (input: ActorDidMove): ActorDidArrive => {
  const origin: PlaceURN = input.location;
  const destination: PlaceURN = input.payload?.destination!;

  return {
    id: uniqid(8),
    ts: input.ts,
    trace: input.trace,
    type: EventType.ACTOR_DID_ARRIVE,
    actor: input.actor,
    location: destination,
    payload: { origin },
  };
};
