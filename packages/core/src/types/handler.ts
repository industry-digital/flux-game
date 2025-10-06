import { EventType, WorldEvent, WorldEventInput } from '~/types/event';
import { Command, CommandType, NaturalLanguageAnalysis } from '~/types/intent';
import { ActorURN, ItemURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { Place } from '~/types/entity/place';
import { Actor } from '~/types/entity/actor';
import { Item } from '~/types/entity/item';
import { AbstractSession } from '~/types/session';
import { SchemaManager } from '~/worldkit/schema/manager';
import { SearchCache } from '~/types/combat-ai';
import { MassApi } from '~/worldkit/physics/mass';
import { ActorEquipmentApi } from '~/worldkit/entity/actor/equipment';
import { ActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { ActorCapacitorApi } from '~/worldkit/entity/actor/capacitor';
import { ActorSkillApi } from '~/worldkit/entity/actor/skill';
import { rollDiceWithRng } from '~/worldkit/dice';
import { ActorSessionApi } from '~/worldkit/entity/actor/session';
import { EntityResolverApi } from '~/intent/resolvers';

/** Combat metrics collection interface for performance monitoring and telemetry */
export type CombatMetrics = {
  recordTiming(metric: string, duration: number): void;
  incrementCounter(metric: string): void;
  recordValue(metric: string, value: number): void;
}

/**
 * Minimum required properties for all world projections
 * @deprecated Use `WorldProjection` instead
 */
export type MinimalWorldProjection = WorldProjection;

/** Union of all possible projections satisfied by the Flux World Server */
export type WorldProjection = {
  actors: Record<ActorURN, Actor>;
  places: Record<PlaceURN, Place>;
  items: Record<ItemURN, Item>;
  sessions: Record<SessionURN, AbstractSession<any, any>>;
};

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
  getDeclaredEvents(type: EventType): WorldEvent[];
  getDeclaredEvents(regex: RegExp): WorldEvent[];
  /** Get events declared by a specific command */
  getDeclaredEventsByCommand<TEventType extends WorldEvent = WorldEvent>(commandId: string): TEventType[];
};

export type EventDeclarationProducer = {
  declareEvent(input: WorldEvent | WorldEventInput): void;
};

export type SchemaConsumer = {
  schemaManager: SchemaManager;
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
  & EventDeclarationConsumer
  & SchemaConsumer
  & WorldProjectionConsumer<W>
  & {
    mass: MassApi;

    // Combat infrastructure - always available
    searchCache: SearchCache;
    rollDice: typeof rollDiceWithRng;

    // Combat memoization - always available
    distanceCache: Map<string, number>;
    targetCache: Map<string, any[]>;
    weaponCache: Map<string, any>;

    inventoryApi: ActorInventoryApi;
    equipmentApi: ActorEquipmentApi;
    actorSkillApi: ActorSkillApi;
    actorSessionApi: ActorSessionApi;
    /**
     * @deprecated Use the pure functions directly instead
     */
    capacitorApi: ActorCapacitorApi;

    // Optional metrics collection for performance monitoring
    metrics?: CombatMetrics;
  };

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

export type Intent = {
  id: string;
  actor: ActorURN;
  location: PlaceURN;
  /**
   * Raw string input from the user
   */
  text: string;
  /**
   * Downcased and trimmed string input from the user
   */
  normalized: string;

  /**
   * The first token of the intent
   */
  verb: string;

  /**
   * Pre-sorted unique tokens created from `normalized`
   */
  tokens: Set<string>;

  /**
   * NLP analysis of the intent text
   * @deprecated
   */
  nlp?: NaturalLanguageAnalysis;
};

export type IntentParserContext = EntityResolverApi & {
  world: WorldProjection;
  uniqid: PotentiallyImpureOperations['uniqid'];
  timestamp: PotentiallyImpureOperations['timestamp'];
};

export type IntentParser<TCommand extends Command> = (
  context: IntentParserContext,
  intent: Intent,
) => TCommand | undefined;

/** Handler that associates a reducer with its dependencies */
export type PureHandlerInterface<
  C,
  I extends Command
> = {
  handles: (input: any) => input is I;
  dependencies: PureHandlerImplementation<C, I>[];
  reduce: PureReducer<C, I>;

  /**
   * Optional function to parse the intent into a well-formed command
   * All user-facing commands should have a parser
   * Administrative/system commands don't need one because they don't arrive as raw text intents
   */
  parse?: IntentParser<I>;
}

export type PureHandlerImplementation<
  C,
  I extends Command,
> = new (...args: any[]) => PureHandlerInterface<C, I>;
