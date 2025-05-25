import { EmergentEvent, EmergentEventInput, EventType } from '~/types/event';
import { Command, CommandType, Intent } from '~/types/intent';
import { EntityURN, PlaceURN } from '~/types/taxonomy';
import { Entity } from '~/types/entity/entity';
import { Place } from '~/types/entity/place';
import { SideEffect, SideEffectInput } from '~/types/side-effect';
import { UUIDLike } from '~/lib/uuid';

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

export type CombatProjectionMixin = {
  // add combat-specific fields
};

export type VendorProjectionMixin = {
  // add vendor-specific fields
};

// Union of all possible projections.
// The Flux World Server satisfies the projection in the Contextualization stage.
export type WorldProjection =
  | MinimalWorldProjection
  | MinimalWorldProjection & CombatProjectionMixin
  | MinimalWorldProjection & VendorProjectionMixin;

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
  declareSideEffect(input: SideEffectInput): void;

  /**
   * Get the list of side effects that have been declared as a result of handling the input.
   */
  getDeclaredSideEffects(): SideEffect[];
};

export type PotentiallyImpureOperations = {
  /**
   * A function that returns a random value between 0 and 1, inclusive.
   */
  random: () => number;

  /**
   * A function that returns the number of milliseconds elapsed since the Unix epoch.
   */
  now: () => number;

  /**
   * A function that returns a UUID
   */
  uuid: () => UUIDLike;
};

/**
 *
 */
export type TransformerContext<
  W extends WorldProjection = WorldProjection,
> =
  & PotentiallyImpureOperations
  & ErrorDeclarationProducer
  & EventDeclarationProducer
  & { world: W };

export type PlannerContext<
  W extends WorldProjection = WorldProjection,
> =
  & PotentiallyImpureOperations
  & ErrorDeclarationProducer
  & ErrorDeclarationConsumer
  & EventDeclarationConsumer
  & SideEffectDeclarationContainer
  & { world: W };

/**
 * Interface for handlers that operate in the Transformation stage
 * These handlers immutably update the world state projection (an Immer draft), and declare emergent events like
 * `ACTOR_DID_MOVE`.
 */
export type TransformerInterface<
  I extends Command,
> = {
  /**
   * The implementation should return `true` if the handler is interested in processing the input
   */
  handles: (command: Command) => command is I;

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
  I extends Command,
> = new (...args: any[]) => TransformerInterface<I>;

/**
 * A pure, deterministic reducer function with zero side effects.
 * It processes input and may declare emergent events on the supplied context.
 */
export type PureReducer<C, I> = (context: C, input: I) => C;

/**
 * A reducer that acts in the pure Transformation stage
 */
export type Transformer<T extends CommandType, A extends Record<string, any>> = PureReducer<TransformerContext, Command<T, A>>;

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

/**
 * Type guard that ensures the input is an Intent
 */
export const isIntent = (input: AllowedInput): input is Intent => {
  return 'type' in input && input.__type === 'intent';
};
