import { EntityURN, PlaceURN } from '~/types/taxonomy';

export type EventPayload = Record<string, any>;

export type AbstractWorldEventInput<T extends EventType, P extends EventPayload> = {
  /**
   * The unique identifier for this event.
   */
  id?: string;
  /**
   * Identfies Intent or Command that triggered this event.
   */
  trace?: string;
  /**
   * The moment in time when the event occurred, expressed as milliseconds since the Unix epoch
   */
  ts?: number;
  /**
   * The type of the event.
   */
  type: T;
  /**
   * The payload of the event.
   */
  payload: P;
};

/**
 * An WorldEvent is an event that is generated as a result of processing a command.
 */
export type WorldEvent = WorldEventInput & {
  id: string;
  ts: number;
  trace: string;
}

export type ErrorExplanation = {
  reason: string;
  message?: string;
};

export enum EventType {
  ACTOR_DID_MOVE = 'actor:moved',
  ACTOR_DID_ARRIVE = 'actor:arrived',
  ACTOR_DID_LEAVE = 'actor:left',
  ACTOR_DID_MATERIALIZE = 'actor:materialized',
  ACTOR_DID_DEMATERIALIZE = 'actor:dematerialized',
}

type ActorEventPayloadBase = {
  actorId: EntityURN;
};

export type ActorDidMaterializeInput =
  & AbstractWorldEventInput<
    EventType.ACTOR_DID_MATERIALIZE,
    ActorEventPayloadBase & { placeId: PlaceURN }
  >;

export type ActorDidDematerializeInput =
  & AbstractWorldEventInput<
    EventType.ACTOR_DID_DEMATERIALIZE,
    ActorEventPayloadBase & { placeId: PlaceURN }
  >;
export type ActorMovementEventPayload = ActorEventPayloadBase & {
  originId: PlaceURN;
  destinationId: PlaceURN;
};

export type ActorDidMoveInput =
  & AbstractWorldEventInput<
    EventType.ACTOR_DID_MOVE,
    ActorMovementEventPayload
  >;

export type ActorDidArriveInput =
  & AbstractWorldEventInput<
    EventType.ACTOR_DID_ARRIVE,
    ActorMovementEventPayload
  >;

export type ActorDidLeaveInput =
  & AbstractWorldEventInput<
    EventType.ACTOR_DID_LEAVE,
    ActorMovementEventPayload
  >;

// Union of all unions
export type WorldEventInput =
  | ActorDidMaterializeInput
  | ActorDidDematerializeInput
  | ActorDidMoveInput
  | ActorDidArriveInput
  | ActorDidLeaveInput;

export type EventBase = {
  id: string;
  ts: number;
  trace: string;
};

export type ActorDidMaterialize = EventBase & ActorDidMaterializeInput;
export type ActorDidDematerialize = EventBase & ActorDidDematerializeInput;
export type ActorDidMove = EventBase & ActorDidMoveInput;
export type ActorDidArrive = EventBase & ActorDidArriveInput;
export type ActorDidLeave = EventBase & ActorDidLeaveInput;
