import { EntityURN, PlaceURN } from '~/types/taxonomy';
import { Direction } from '~/types/world/space';

export type EventPayload = Record<string, any>;

export type AbstractEmergentEventInput<T extends EventType, P extends EventPayload = EventPayload> = {
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

export enum EventType {
  ACTOR_MOVEMENT_DID_SUCCEED = 'actor:move:success',
  ACTOR_MOVEMENT_DID_FAIL = 'actor:move:failure',
};

type ActorEventPayloadBase = {
  actor: EntityURN;
};

export type ActorMovementEventPayload = ActorEventPayloadBase & {
  origin: PlaceURN;
  direction: Direction;
};

export type ActorMovementDidFailEventPayload = ActorMovementEventPayload & {
  reason: string;
  message?: string;
};

export type ActorMovementDidSucceedEventPayload = ActorMovementEventPayload & {
  destination: PlaceURN;
}

export type ActorMovementDidFailEventInput = AbstractEmergentEventInput<
  EventType.ACTOR_MOVEMENT_DID_FAIL,
  ActorMovementDidFailEventPayload
>;

export type ActorMovementDidSucceedEventInput = AbstractEmergentEventInput<
  EventType.ACTOR_MOVEMENT_DID_SUCCEED,
  ActorMovementDidSucceedEventPayload
>;

export type EmergentEventInput =
  | ActorMovementDidFailEventInput
  | ActorMovementDidSucceedEventInput;
