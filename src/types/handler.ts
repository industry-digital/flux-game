import { WorldEvent, WorldEventInput, EventType } from '~/types/event';
import { Command, CommandType } from '~/types/intent';
import { ActorURN, ItemURN, PlaceURN } from '~/types/taxonomy';
import { Place } from '~/types/entity/place';
import { Actor } from '~/types/entity/actor';
import { Item } from '~/types/entity/item';

/** Filter function for WorldEvent matching */
type EventFilter = (event: WorldEvent) => boolean;

/** Minimum required properties for all world projections */
export type MinimalWorldProjection = {
  actors: Record<ActorURN, Actor>;
  places: Record<PlaceURN, Place>;
  items: Record<ItemURN, Item>;
};

export type CombatProjectionMixin = {
  // add combat-specific fields
};

export type TradeProjectionMixin = {
  // add vendor-specific fields
};

/** Union of all possible projections satisfied by the Flux World Server */
export type WorldProjection =
  | MinimalWorldProjection
  | MinimalWorldProjection & CombatProjectionMixin
  | MinimalWorldProjection & TradeProjectionMixin;

export type ExecutionError = {
  /** Timestamp in milliseconds since Unix epoch */
  ts: number;
  error: Error;
  /** Identifies the Intent or Command that caused the error */
  trace: string;
};

export type ErrorDeclarationProducer = {
  declareError(error: Error): void;
  declareError(message: string): void;
  declareError(message: string, trace: string): void;
};

export type ErrorDeclarationConsumer = {
  getDeclaredErrors(): ExecutionError[];
};

export type EventDeclarationConsumer = {
  getDeclaredEvents(): WorldEvent[];
  /** Get events matching a picomatch glob pattern */
  getDeclaredEvents(pattern: string): WorldEvent[];
  /** Get events declared by a specific command */
  getDeclaredEventsByCommand<TEventType extends WorldEvent = WorldEvent>(commandId: string): TEventType[];
  countDeclaredEvents(type?: EventType, filter?: EventFilter): number;
};

export type EventDeclarationProducer = {
  declareEvent(input: WorldEventInput): void;
};

/** Profile a function call and return both the result and duration. */
export type ProfileResult<T> = {
  /**
   * Result of the function call
   */
  result: T;

  /**
   * Duration in microseconds
   */
  duration: number;
};

/** Impure operations injected into execution context to keep reducers pure */
export type PotentiallyImpureOperations = {
  random: () => number;
  timestamp: () => number;
  uniqid: () => string;
  debug: (...args: any[]) => void;
  profile: <T>(fn: () => T) => ProfileResult<T>;
};

export type WorldProjectionConsumer<W extends WorldProjection = WorldProjection> = {
  world: W;
};

export type TransformerContext<W extends WorldProjection = WorldProjection> =
  & PotentiallyImpureOperations
  & ErrorDeclarationProducer
  & EventDeclarationProducer
  & WorldProjectionConsumer<W>;

/** Handlers that immutably update world state and declare emergent events */
export type TransformerInterface<
  I extends Command,
> = {
  handles: (command: Command) => command is I;
  dependencies: TransformerImplementation<I>[];
  /** Pure reducer that updates world projection and declares events */
  reduce: PureReducer<TransformerContext, I>;
}

export type TransformerImplementation<
  I extends Command,
> = new (...args: any[]) => TransformerInterface<I>;

/** Pure, deterministic reducer with zero side effects */
export type PureReducer<C, I, O = any> = (context: C, input: I, ...args: O[]) => C;

export type CommandReducer<T extends CommandType, A extends Record<string, any>> = PureReducer<TransformerContext, Command<T, A>>;

export type InputTypeGuard<I extends Command, S extends I> = (input: I) => input is S;

/** Handler that associates a reducer with its dependencies */
export type PureHandlerInterface<
  C,
  I extends Command
> = {
  handles: (input: any) => input is I;
  dependencies: PureHandlerImplementation<C, I>[];
  reduce: PureReducer<C, I>;
}

export type PureHandlerImplementation<
  C,
  I extends Command,
> = new (...args: any[]) => PureHandlerInterface<C, I>;
