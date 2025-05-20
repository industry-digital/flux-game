import { EntityURN, PlaceURN, Taxonomy } from './domain';

export enum EventType {
  ACTOR_MOVEMENT_DID_SUCCEED = 'actor:move:success',
  ACTOR_MOVEMENT_DID_FAIL = 'actor:move:failure',
};

export type EmergentEventInput<T extends EventType, P extends Record<string, any>> = {
  /**
   * The unique identifier for this event.
   */
  id?: string;
  /**
   * The Intent or Command that triggered this event.
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

type ActorMovementEventInputBase = {
  actor: EntityURN;
  origin: PlaceURN;
  dest: PlaceURN;
  exit: Taxonomy.Directions;
};

export type ActorMovementDidFailEventInput = EmergentEventInput<
  EventType.ACTOR_MOVEMENT_DID_FAIL,
  ActorMovementEventInputBase & { cause: Taxonomy.Causes }
>;

export type ActorMovementDidSucceedEventInput = EmergentEventInput<
  EventType.ACTOR_MOVEMENT_DID_SUCCEED,
  ActorMovementEventInputBase
>;
