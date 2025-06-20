import { EntityURN, PlaceURN } from '~/types/taxonomy';

export type EventPayload = Record<string, any>;

export type AbstractEmergentEventInput<T extends EventType, P extends EventPayload> = {
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
 * An EmergentEvent is an event that is generated as a result of processing a command.
 */
export type EmergentEvent = EmergentEventInput & {
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
  ACTOR_DID_MATERIALIZE = 'actor:materialized',
  ACTOR_DID_DEMATERIALIZE = 'actor:dematerialized',
}

export type EntityEventPayloadBase = {
  entityId: EntityURN;
};

type ActorEventPayloadBase = {
  actorId: EntityURN;
};

export type ActorMovementEventPayload = ActorEventPayloadBase & {
  originId: PlaceURN;
  destinationId: PlaceURN;
};

export type ActorMovementEventInput =
  & AbstractEmergentEventInput<
    EventType.ACTOR_DID_MOVE,
    ActorMovementEventPayload
  >;

export type ActorMaterializedEventInput =
  & AbstractEmergentEventInput<
    EventType.ACTOR_DID_MATERIALIZE,
    ActorEventPayloadBase & { placeId: PlaceURN }
  >;

export type ActorDematerializedEventInput =
  & AbstractEmergentEventInput<
    EventType.ACTOR_DID_DEMATERIALIZE,
    ActorEventPayloadBase & { placeId: PlaceURN }
  >;

// Union of all unions
export type EmergentEventInput =
  | ActorMaterializedEventInput
  | ActorDematerializedEventInput
  | ActorMovementEventInput;
