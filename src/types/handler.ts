import { WorldEvent, WorldEventInput, EventType } from '~/types/event';
import { SystemCommand, CommandType, Intent, AnyCommand } from '~/types/intent';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { Place } from '~/types/entity/place';
import { Actor } from '~/types/entity/actor';

/**
 * Union type of all allowed input types for the pipeline
 */
export type AllowedInput = SystemCommand | Intent;

/**
 * For filter() and find() methods, this is a function that takes an WorldEvent
 * and returns a boolean indicating whether the event matches the filter criteria.
 */
type EventFilter = (event: WorldEvent) => boolean;

/**
 * This is the absolute minimum set of properties that all world projections must have.
 */
export type MinimalWorldProjection = {
  /**
   * All contextually relevant Actors
   */
  actors: Record<ActorURN, Actor>;

  /**
   * All contextually relevant Places
   */
  places: Record<PlaceURN, Place>;
};

export type CombatProjectionMixin = {
  // add combat-specific fields
};

export type TradeProjectionMixin = {
  // add vendor-specific fields
};

// Union of all possible projections.
// The Flux World Server satisfies the projection in the Contextualization stage.
export type WorldProjection =
  | MinimalWorldProjection
  | MinimalWorldProjection & CombatProjectionMixin
  | MinimalWorldProjection & TradeProjectionMixin;

/**
 * An error that occurred during the execution of a command.
 */
export type ExecutionError = {
  /**
   * The moment in time when the error occurred, expressed as milliseconds since the Unix epoch
   */
  ts: number;
  /**
   * The actual Error
   */
  error: Error;
  /**
   * Identifies the Intent or Command that caused the error
   */
  trace: string;
};

export type ErrorDeclarationProducer = {
  /**
   * Declare an error to be emitted in response to the input
   */
  declareError(error: Error): void;
  declareError(message: string): void;
};

export type ErrorDeclarationConsumer = {
  /**
   * Get the list of errors that have been declared as a result of handling the input.
   */
  getDeclaredErrors(): ExecutionError[];
};

export type EventDeclarationConsumer = {
  /**
   * Get the list of emergent events that have been declared as a result of handling the input.
   */
  getDeclaredEvents(): WorldEvent[];

  /**
   * Get the list of emergent events matching a given type using a picomatch
   * glob expressions.
   */
  getDeclaredEvents(pattern: string): WorldEvent[];

  /**
   * Get the list of emergent events that have been declared by a specific command.
   */
  getDeclaredEventsByCommand(commandId: string): WorldEvent[];

  /**
   * Return a count of the number of times the given event type has been declared.
   */
  countDeclaredEvents(type?: EventType, filter?: EventFilter): number;
};

/**
 * A container for emergent events that have been declared as a result of handling the input.
 */
export type EventDeclarationProducer = {
  /**
   * Declare an emergent event to be emitted in response to the input.
   */
  declareEvent(input: WorldEventInput): void;
};

/**
 * Potentailly impure operations that our pure reducers need to do their job.
 * These are injected into the execution context so that pure stages can stay pure.
 */
export type PotentiallyImpureOperations = {
  /**
   * A function that returns a random value between 0 and 1, inclusive.
   */
  random: () => number;

  /**
   * A function that returns the number of milliseconds elapsed since the Unix epoch.
   */
  timestamp: () => number;

  /**
   * A function that returns a globally unique identifier. Implementations may return a UUID
   * or any string of sufficient entropy.
   */
  uniqid: () => string;

  /**
   * A function that logs a message to the console.
   */
  debug: (...args: any[]) => void;
};

/**
 * A consumer of world state that needs read access to the world projection
 */
export type WorldProjectionConsumer<W extends WorldProjection = WorldProjection> = {
  world: W;
};

/**
 * Context during transformation stage
 */
export type TransformerContext<W extends WorldProjection = WorldProjection> =
  & PotentiallyImpureOperations
  & ErrorDeclarationProducer
  & EventDeclarationProducer
  & WorldProjectionConsumer<W>;

/**
 * Interface for handlers that operate in the Transformation stage
 * These handlers immutably update the world state projection (an Immer draft), and declare emergent events like
 * `ACTOR_DID_MOVE`.
 */
export type TransformerInterface<
  I extends SystemCommand,
> = {
  /**
   * The implementation should return `true` if the handler is interested in processing the input
   */
  handles: (command: SystemCommand) => command is I;

  /**
   * Dependencies on other transformers that must run before this one
   */
  dependencies: TransformerImplementation<I>[];

  /**
   * A pure, deterministic reducer function that:
   * 1) performs immutable updates to the world projection, and
   * 2) declares emergent events.
   */
  reduce: PureReducer<TransformerContext, I>;
}

export type TransformerImplementation<
  I extends SystemCommand,
> = new (...args: any[]) => TransformerInterface<I>;

/**
 * A pure, deterministic reducer function with zero side effects.
 * It processes input and may declare emergent events on the supplied context.
 */
export type PureReducer<C, I> = (context: C, input: I) => C;

/**
 * A reducer that acts in the pure Transformation stage
 * @deprecated Use PureReducer<TransformerContext, AnyCommand<T, A>> instead for more flexibility
 */
export type Transformer<T extends CommandType, A extends Record<string, any>> = PureReducer<TransformerContext, SystemCommand<T, A>>;

/**
 * A flexible command reducer that can handle both system and actor commands
 */
export type CommandReducer<T extends CommandType, A extends Record<string, any>> = PureReducer<TransformerContext, AnyCommand<T, A>>;

/**
 * Type guard for determining if a handler can process a specific input
 */
export type InputTypeGuard<I extends SystemCommand, S extends I> = (input: I) => input is S;

/**
 * A handler is just an object that associates a reducer-like function with its dependencies.
 * PureHandlerInterface is a handler that exposes a `reduce` method that takes a context
 * and an input. The reducer function performs immutable updates to the supplied context,
 * in a pure and deterministic manner.
 */
export type PureHandlerInterface<
  C,
  I extends AllowedInput,
> = {
  /**
   * The implementation should return `true` if the handler is interested in processing the input
   */
  handles: (input: AllowedInput) => input is I;

  /**
   * Dependencies on other handlers that must run before this one.
   */
  dependencies: PureHandlerImplementation<C, I>[];

  /**
   * A pure, deterministic reducer function with zero side effects.
   */
  reduce: PureReducer<C, I>;
}

export type PureHandlerImplementation<
  C,
  I extends AllowedInput,
> = new (...args: any[]) => PureHandlerInterface<C, I>;

/**
 * Type guard that ensures the input is an Intent
 */
export const isIntent = (input: AllowedInput): input is Intent => {
  return 'type' in input && input.__type === 'intent';
};
