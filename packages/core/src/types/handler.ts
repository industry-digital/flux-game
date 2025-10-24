import { EventType, WorldEvent, WorldEventInput } from '~/types/event';
import { Command, CommandType } from '~/types/intent';
import { SchemaManager } from '~/worldkit/schema/manager';
import { SearchCache } from '~/types/combat-ai';
import { MassApi } from '~/worldkit/physics/mass';
import { ActorEquipmentApi } from '~/worldkit/entity/actor/equipment';
import { ActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { ActorSkillApi } from '~/worldkit/entity/actor/skill';
import { rollDiceWithRng } from '~/worldkit/dice';
import { WorldProjection } from '~/types/world';
import { CommandResolver } from '~/types/intent';
import { RollApi } from '~/types/dice';
import { ActorWeaponApi } from '~/worldkit/entity/actor/weapon';
import { Locale, SchemaTranslation } from '~/types/i18n';
import { SchemaURN } from '~/types/taxonomy';
import { PartyApi } from '~/worldkit/entity/group/party';

/** Combat metrics collection interface for performance monitoring and telemetry */
export type CombatMetrics = {
  recordTiming(metric: string, duration: number): void;
  incrementCounter(metric: string): void;
  recordValue(metric: string, value: number): void;
}

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
  resetErrors(): void;
};

export type EventDeclarationConsumer = {
  getDeclaredEvents(): WorldEvent[];
  getDeclaredEvents(type: EventType): WorldEvent[];
  getDeclaredEvents(regex: RegExp): WorldEvent[];
  /** Get events declared by a specific command */
  getDeclaredEventsByCommand<TEventType extends WorldEvent = WorldEvent>(commandId: string): TEventType[];
  resetEvents(): void;
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
  & ErrorDeclarationConsumer
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
    skillApi: ActorSkillApi;
    weaponApi: ActorWeaponApi;
    rollApi: RollApi;
    partyApi: PartyApi;

    getSchemaTranslation: (locale: Locale, schemaUrn: SchemaURN) => SchemaTranslation;

    // Optional metrics collection for performance monitoring
    metrics?: CombatMetrics;
  };

export type Transformer<I extends Command> = PureReducer<TransformerContext, I>;

/** Handlers that immutably update world state and declare emergent events */
export type TransformerInterface<
  I extends Command,
> = {
  handles: (command: Command) => command is I;
  dependencies: TransformerImplementation<I>[];
  /** Pure reducer that updates world projection and declares events */
  reduce: Transformer<I>;
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

  /**
   * Optional function to parse the intent into a well-formed command
   * All user-facing commands should have a parser
   * Administrative/system commands don't need one because they don't arrive as raw text intents
   */
  resolve?: CommandResolver<I>;
}

export type PureHandlerImplementation<
  C,
  I extends Command,
> = new (...args: any[]) => PureHandlerInterface<C, I>;
