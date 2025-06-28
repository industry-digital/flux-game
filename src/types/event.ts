import { ActorURN, PlaceURN } from '~/types/taxonomy';

export type EventPayload = Record<string, any>;

export type AbstractWorldEventInput<T extends EventType, P extends EventPayload> = {
  /**
   * The unique identifier for this event.
   */
  id?: string;

  /**
   * Identfies Intent or Command that triggered this event.
   */
  trace: string;

  /**
   * The moment the event occurred, expressed as milliseconds since the Unix epoch
   */
  ts?: number;

  /**
   * The type of the event.
   */
  type: T;

  /**
   * Where did it happen?
   */
  location: PlaceURN;

  /**
   * The actor that triggered the event, if any.
   */
  actor?: ActorURN;

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
};

export type ErrorExplanation = {
  reason: string;
  message?: string;
};

export enum EventType {
  ACTOR_WAS_CREATED = 'actor:created',
  PLACE_WAS_CREATED = 'place:created',
  ACTOR_DID_MOVE = 'actor:moved',
  ACTOR_DID_ARRIVE = 'actor:arrived',
  ACTOR_DID_LEAVE = 'actor:left',
  ACTOR_DID_MATERIALIZE = 'actor:materialized',
  ACTOR_DID_DEMATERIALIZE = 'actor:dematerialized',
}

export type RequiresActor = {
  actor: ActorURN;
};

export type ActorWasCreatedInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_WAS_CREATED, {}>;
export type PlaceWasCreatedInput = AbstractWorldEventInput<EventType.PLACE_WAS_CREATED, {}>;

export type ActorDidMaterializeInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_MATERIALIZE, {}>;
export type ActorDidMaterialize = EventBase & ActorDidMaterializeInput;

export type ActorDidDematerializeInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_DEMATERIALIZE, {}>;
export type ActorDidDematerialize = EventBase & ActorDidDematerializeInput;

export type ActorDidMoveInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_MOVE, { destination: PlaceURN }>;
export type ActorDidMove = EventBase & ActorDidMoveInput;

export type ActorDidDepartInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_LEAVE, { destination: PlaceURN }>;
export type ActorDidDepart = EventBase & ActorDidDepartInput;

export type ActorDidArriveInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_ARRIVE, { origin: PlaceURN }>;
export type ActorDidArrive = EventBase & ActorDidArriveInput;

export type WorldEventInput =
  | ActorWasCreatedInput
  | PlaceWasCreatedInput
  | ActorDidMaterializeInput
  | ActorDidDematerializeInput
  | ActorDidMoveInput
  | ActorDidArriveInput
  | ActorDidDepartInput

export type EventBase = {
  id: string;
  ts: number;
  trace: string;
};
