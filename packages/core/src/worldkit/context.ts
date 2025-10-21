import { TransformerContext, PotentiallyImpureOperations } from '~/types/handler';
import { uniqid as uniqidImpl, BASE62_CHARSET } from '~/lib/random';
import { profile as profileImpl } from '~/lib/profile';
import { createSchemaManager } from '~/worldkit/schema/manager';
import { createMassApi, createMassComputationState } from '~/worldkit/physics/mass';
import { ExecutionError } from '~/types/handler';
import { WorldProjection } from '~/types/world';
import { EventType, WorldEvent, WorldEventInput } from '~/types/event';
import { rollDiceWithRng } from '~/worldkit/dice';
import { createActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { createActorEquipmentApi } from '~/worldkit/entity/actor/equipment';
import { createCombatMetricsApi } from '~/worldkit/combat/metrics';
import { createActorSkillApi } from '~/worldkit/entity/actor/skill';
import { createRollApi } from '~/worldkit/dice';
import { createActorWeaponApi } from '~/worldkit/entity/actor/weapon';

export type MapFunction<T> = (context: T) => T;
const identity = <T extends any>(context: T): T => context;

export const createPotentiallyImpureOperations = (
  random = () => Math.random(),
  timestamp = () => Date.now(),
  uniqid = () => uniqidImpl(24, BASE62_CHARSET),
  debug = () => {},
  profile = profileImpl,
): PotentiallyImpureOperations => {
  return {
    random,
    timestamp,
    uniqid,
    debug,
    profile,
  };
};

export const DEFAULT_POTENTIALLY_IMPURE_OPERATIONS: Readonly<PotentiallyImpureOperations> = createPotentiallyImpureOperations();

export const createWorldProjection = (map: MapFunction<WorldProjection> = identity): WorldProjection => {
  return map({
    actors: {},
    places: {},
    items: {},
    sessions: {},
    groups: {},
  });
};

/**
 * Returns a fully-formed TransformerContext with a CombatContext and a MassComputationState
 */
export const createTransformerContext = (
  map: MapFunction<TransformerContext> = identity,
  world = createWorldProjection(),
  schemaManager = createSchemaManager(),
  deps = DEFAULT_POTENTIALLY_IMPURE_OPERATIONS,
  mass = createMassApi(schemaManager, createMassComputationState()),
  inventoryApi = createActorInventoryApi(mass),
  equipmentApi = createActorEquipmentApi(schemaManager, inventoryApi),
  weaponApi = createActorWeaponApi(schemaManager, inventoryApi, equipmentApi),
  skillApi = createActorSkillApi(),
  rollApi = createRollApi(),
  metrics = createCombatMetricsApi(),
): TransformerContext => {
  const declaredEvents: WorldEvent[] = [];
  const declaredEventsByType: Map<EventType, WorldEvent[]> = new Map();
  const declaredEventsByCommand: Map<string, WorldEvent[]> = new Map();
  const declaredErrors: ExecutionError[] = [];
  const declaredEventIds: Set<string> = new Set();

  const declareEvent = (input : WorldEvent | WorldEventInput): void => {
    const event: WorldEvent = {
      id: input.id ?? deps.uniqid(),
      ts: input.ts ?? deps.timestamp(),
      ...input
    };

    // Architectural safeguard: prevent duplicate event declarations
    if (declaredEventIds.has(event.id)) {
      throw new Error(
        `Duplicate event declaration detected: Event with ID "${event.id}" (type: ${event.type}) has already been declared. ` +
        `This indicates a bug in the event handling system where the same event is being declared multiple times.`
      );
    }

    declaredEventIds.add(event.id);
    declaredEvents.push(event);

    if (!declaredEventsByType.has(event.type)) {
      declaredEventsByType.set(event.type, []);
    }

    declaredEventsByType.get(event.type)?.push(event);

    if (event.trace) {
      if (!declaredEventsByCommand.has(event.trace)) {
        declaredEventsByCommand.set(event.trace, []);
      }
      declaredEventsByCommand.get(event.trace)?.push(event);
    }
  };


  // Overloaded declareError function to match ErrorDeclarationProducer interface
  function declareError(error: Error): void;
  function declareError(message: string): void;
  function declareError(message: string, trace: string): void;
  function declareError(errorOrMessage: Error | string, trace: string = 'unknown'): void {
    const errorObj = typeof errorOrMessage === 'string' ? new Error(errorOrMessage) : errorOrMessage;
    const executionError: ExecutionError = {
      ts: deps.timestamp(),
      error: errorObj,
      trace,
    };

    // Log all declared errors to console for debugging
    console.error(`❌ TransformerContext Error [${trace}]:`, errorObj.message);
    if (errorObj.stack) {
      console.error(`   Stack:`, errorObj.stack);
    }

    declaredErrors.push(executionError);
  };

  const getDeclaredErrors = () => declaredErrors;

  const getDeclaredEvents = (pattern?: RegExp | EventType): WorldEvent[] => {
    if (!pattern) return declaredEvents;
    if (pattern instanceof RegExp) {
      return declaredEvents.filter(event => pattern.test(event.type));
    }
    return declaredEvents.filter(event => event.type === pattern);
  };

  const getDeclaredEventsByCommand = <TEventType extends WorldEvent = WorldEvent>(trace: string): TEventType[] => {
    return (declaredEventsByCommand.get(trace) || []) as TEventType[];
  };

  const resetErrors = () => {
    declaredErrors.length = 0;
  };

  const resetEvents = () => {
    declaredEvents.length = 0;
    declaredEventsByType.clear();
    declaredEventsByCommand.clear();
    declaredEventIds.clear();
  };

  const transformerContext: TransformerContext = {
    resetEvents,
    resetErrors,
    world,
    mass,
    schemaManager,
    declareEvent,
    declareError,
    getDeclaredErrors,

    getDeclaredEvents,
    getDeclaredEventsByCommand,

    // Combat infrastructure
    searchCache: new Map(),
    rollDice: rollDiceWithRng,

    // Combat memoization
    distanceCache: new Map(),
    targetCache: new Map(),
    weaponCache: new Map(),

    inventoryApi,
    equipmentApi,
    skillApi,
    weaponApi,
    rollApi,
    metrics,

    ...deps,
  };

  return map(transformerContext as TransformerContext);
};
