import { EmergentEvent, EmergentEventInput, EventType } from '~/types/event';
import { Command, CommandType, Intent } from '~/types/intent';
import { EntityURN, PlaceURN } from '~/types/taxonomy';
import { Entity } from '~/types/entity/entity';
import { Place } from '~/types/entity/place';
import { SideEffect, SideEffectInput } from '~/types/side-effect';
;

/**
 * Union type of all allowed input types for the pipeline
 */
export type AllowedInput = Command | Intent;

/**
 * For filter() and find() methods, this is a function that takes an EmergentEvent
 * and returns a boolean indicating whether the event matches the filter criteria.
 */
type EventFilter = (event: EmergentEvent) => boolean;

/**
 * This is the minimal set of properties that a world projection must have.
 */
export type MinimalWorldProjection = {
  self: EntityURN;
  actors: Record<EntityURN, Entity>;
  places: Record<PlaceURN, Place>;
};

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

export type ErrorDeclarationContainer = {
  /**
   * Declare an error to be emitted in response to the input
   */
  declareError(error: Error): void;
  declareError(message: string): void;

  /**
   * Get the list of errors that have been declared as a result of handling the input.
   */
  getDeclaredErrors(): ExecutionError[];
}

export type EventDeclarationConsumer = {
  /**
   * Get the list of emergent events that have been declared as a result of handling the input.
   */
  getDeclaredEvents(): EmergentEvent[];

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
  declareEvent(input: EmergentEventInput): void;
};

export type SideEffectDeclarationContainer = {
  /**
   * Declare a side effect to be emitted in response to the input.
   */
  declareSideEffect<T, A>(input: SideEffectInput<T, A>): void;

  /**
   * Get the list of side effects that have been declared as a result of handling the input.
   */
  getDeclaredSideEffects(): SideEffect<any, any>[];
};

/**
 *
 */
export type TransformerContext<
  W extends MinimalWorldProjection = MinimalWorldProjection,
> =
  & ErrorDeclarationContainer
  & EventDeclarationProducer
  & { world: W };

export type PlannerContext<
  W extends MinimalWorldProjection = MinimalWorldProjection,
> =
  & EventDeclarationConsumer
  & SideEffectDeclarationContainer
  & { world: W };

/**
 * Interface for handlers that operate in the Transformation stage
 * These handlers process commands/intents and declare events and errors
 */
export type TransformerInterface<
  I extends Command,
> = {
  /**
   * The implementation should return `true` if the handler is interested in processing the input
   */
  handles: (input: Command) => input is I;

  /**
   * Dependencies on other transformers that must run before this one
   */
  dependencies: TransformerImplementation<I>[];

  /**
   * A pure, deterministic reducer function that transforms world state
   */
  reduce: PureReducer<TransformerContext, I>;
}

export type TransformerImplementation<
  I extends Command,
> = new (...args: any[]) => TransformerInterface<I>;

/**
 * Interface for handlers that operate in the Planning stage
 * These handlers consume events and declare side effects
 */
export type PlannerInterface<
  I extends Command,
> = {
  /**
   * The implementation should return `true` if the handler is interested in processing the input
   */
  handles: (input: Command) => input is I;

  /**
   * Dependencies on other planners that must run before this one
   */
  dependencies: PlannerImplementation<I>[];

  /**
   * A pure, deterministic reducer function that plans side effects
   */
  reduce: PureReducer<PlannerContext, I>;
}

export type PlannerImplementation<
  I extends Command,
> = new (...args: any[]) => PlannerInterface<I>;

export type PureReducerContext = TransformerContext | PlannerContext;

/**
 * A pure, deterministic reducer function with zero side effects.
 * It processes input and may declare emergent events on the supplied context.
 */
export type PureReducer<
  C extends PureReducerContext,
  I extends AllowedInput,
> = (context: C, input: I) => C;

/**
 * A reducer that acts in the pure Transformation stage
 */
export type Transformer<T extends CommandType, A extends Record<string, any>> = PureReducer<TransformerContext, Command<T, A>>;

/**
 * A reducer that acts in the pure Planning stage
 */
export type Planner<T extends CommandType, A extends Record<string, any>> = PureReducer<PlannerContext, Command<T, A>>;

/**
 * Type guard for determining if a handler can process a specific input
 */
export type InputTypeGuard<I extends Command, S extends I> = (input: I) => input is S;

/**
 * A handler is just an object that associates a reducer-like function with its dependencies.
 * PureHandlerInterface is a handler that exposes a `reduce` method that takes a context
 * and an input. The reducer function performs immutable updates to the supplied context,
 * in a pure and deterministic manner.
 */
export type PureHandlerInterface<
  C extends PureReducerContext,
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
  C extends PureReducerContext,
  I extends AllowedInput,
> = new (...args: any[]) => PureHandlerInterface<C, I>;

/**
 * Type guard for Commands with specific type and arguments
 */
export type CommandTypeGuard<T extends CommandType, A extends Record<string, any> = {}> =
  InputTypeGuard<Command, Command<T, A>>;

/**
 * Helper function to create a command type guard
 */
export function createCommandGuard<T extends CommandType, A extends Record<string, any> = {}>(
  type: T
): CommandTypeGuard<T, A> {
  return (input: Command): input is Command<T, A> =>
    'type' in input && input.type === type;
}

/**
 * Type guard that checks if input is a validated Command of a specific type
 */
export const isCommandOfType = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  input: Command,
  type: T
): input is Command<T, A> => {
  return 'type' in input && input.__type === 'command' && input.type === type;
};
