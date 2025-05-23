/**
 * Override this with an enum in your local codebase via declaration merging.
 */
export type EventType = any;

export type EventPayload = Record<string, any>;

export type EmergentEventInput<T extends EventType, P extends EventPayload = EventPayload> = {
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

/**
 * An EmergentEvent is an event that is generated as a result of processing a command.
 */
export type EmergentEvent<T extends EventType = EventType, P extends EventPayload = EventPayload> = EmergentEventInput<T, P> & {
  id: string;
  ts: number;
  trace: string;
}
