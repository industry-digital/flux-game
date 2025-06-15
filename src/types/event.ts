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
  PLACE_CREATION_DID_SUCCEED = 'place:creation:success',
  PLACE_CREATION_DID_FAIL = 'place:creation:failure',
  ACTOR_MOVEMENT_DID_SUCCEED = 'actor:move:success',
  ACTOR_MOVEMENT_DID_FAIL = 'actor:move:failure',
  ACTOR_CREATION_DID_SUCCEED  = 'actor:creation:success',
  ACTOR_CREATION_DID_FAIL = 'actor:creation:failure',
}

export type PlaceEventPayloadBase = {
  placeId: PlaceURN;
};

export type PlaceCreationDidSucceedInput =
  & AbstractEmergentEventInput<
    EventType.PLACE_CREATION_DID_SUCCEED,
    PlaceEventPayloadBase
  >;

export type PlaceCreationDidFailInput =
  & AbstractEmergentEventInput<
    EventType.PLACE_CREATION_DID_FAIL,
    PlaceEventPayloadBase & ErrorExplanation
  >;

export type PlaceCreationEventInput =
  | PlaceCreationDidSucceedInput
  | PlaceCreationDidFailInput;

type ActorEventPayloadBase = {
  actorId: EntityURN;
};

export type ActorCreationDidSucceedInput =
  & AbstractEmergentEventInput<
    EventType.ACTOR_CREATION_DID_SUCCEED,
    ActorEventPayloadBase
  >;

export type ActorCreationDidFailInput =
  & AbstractEmergentEventInput<
    EventType.ACTOR_CREATION_DID_FAIL,
    ActorEventPayloadBase & ErrorExplanation
  >;

export type ActorCreationEventInput =
  | ActorCreationDidSucceedInput
  | ActorCreationDidFailInput;

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


// Union of all unions
export type EmergentEventInput =
  | PlaceCreationEventInput
  | ActorCreationEventInput
  | ActorMovementEventInput;
