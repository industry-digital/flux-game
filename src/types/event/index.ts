import { ActorURN, PlaceURN } from '~/types/taxonomy';

/**
 * Override this with an enum in your local codebase via declaration merging.
 */
export type EventType = any;

export type EventPayload = Record<string, any>;

export type WorldEventInput<T extends EventType, P extends EventPayload = EventPayload> = {
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
   * The actor that triggered the event, if any.
   */
  actor?: ActorURN;

  /**
   * Where the event took place, if any.
   */
  location?: PlaceURN;

  /**
   * The payload of the event.
   */
  payload: P;
};

/**
 * An WorldEvent is an event that is generated as a result of processing a command.
 */
export type WorldEvent<T extends EventType = EventType, P extends EventPayload = EventPayload> = WorldEventInput<T, P> & {
  id: string;
  ts: number;
  trace: string;
}
