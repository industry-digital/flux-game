import { EntityURN, PlaceURN } from '~/types/taxonomy';
import { Direction } from '~/types/world/space';

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
  ENTITY_CREATED = 'entity:created',
  ENTITY_UPDATED = 'entity:updated',
  ACTOR_MOVEMENT_DID_SUCCEED = 'actor:move:success',
  ACTOR_MOVEMENT_DID_FAIL = 'actor:move:failure',
  ACTOR_DID_MATERIALIZE = 'actor:materialized',
  ACTOR_DID_DEMATERIALIZE = 'actor:dematerialized',
}

export type EntityEventPayloadBase = {
  entityId: EntityURN;
};

export type EntityCreatedInput =
  & AbstractEmergentEventInput<
    EventType.ENTITY_CREATED,
    EntityEventPayloadBase
  >;

export type EntityUpdatedInput =
  & AbstractEmergentEventInput<
    EventType.ENTITY_UPDATED,
    EntityEventPayloadBase
  >;

export type EntityEventInput =
  | EntityCreatedInput
  | EntityUpdatedInput;

type ActorEventPayloadBase = {
  actorId: EntityURN;
};

export type ActorMovementEventPayload =
  & ActorEventPayloadBase
  & {
    originId: PlaceURN;
    direction: Direction;
  };

export type ActorMovementDidFailInput =
  & AbstractEmergentEventInput<
    EventType.ACTOR_MOVEMENT_DID_FAIL,
    ActorMovementEventPayload & ErrorExplanation
  >;

export type ActorMovementDidSucceedInput =
  & AbstractEmergentEventInput<
    EventType.ACTOR_MOVEMENT_DID_SUCCEED,
    ActorMovementEventPayload & { destinationId: PlaceURN }
  >;

// Union of all actor movement events
export type ActorMovementEventInput =
  | ActorMovementDidFailInput
  | ActorMovementDidSucceedInput;

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
  | EntityEventInput
  | ActorMovementEventInput
  | ActorMaterializedEventInput
  | ActorDematerializedEventInput;
