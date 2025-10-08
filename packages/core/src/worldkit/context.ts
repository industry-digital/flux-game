import { TransformerContext, PotentiallyImpureOperations } from '~/types/handler';
import { uniqid as uniqidImpl, BASE62_CHARSET } from '~/lib/random';
import { profile as profileImpl } from '~/lib/profile';
import { createSchemaManager } from '~/worldkit/schema/manager';
import { createMassApi, createMassComputationState } from '~/worldkit/physics/mass';
import { ExecutionError, WorldProjection } from '~/types/handler';
import { EventType, WorldEvent, WorldEventInput } from '~/types/event';
import { rollDiceWithRng } from '~/worldkit/dice';
import { createActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { createActorEquipmentApi } from '~/worldkit/entity/actor/equipment';
import { createActorCapacitorApi } from '~/worldkit/entity/actor/capacitor';
import { createCombatMetricsApi } from '~/worldkit/combat/metrics';
import { createActorSkillApi } from '~/worldkit/entity/actor/skill';
import { createActorSessionApi } from '~/worldkit/entity/actor/session';

export type MapFunction<T> = (context: T) => T;
const identity = <T extends any>(context: T): T => context;

export const createPotentiallyImpureOperations = (
  random = () => Math.random(),
  timestamp = () => Date.now(),
  uniqid = () => uniqidImpl(16, BASE62_CHARSET),
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
  actorSkillApi = createActorSkillApi(),
  capacitorApi = createActorCapacitorApi(),
  metrics = createCombatMetricsApi(),
  actorSessionApi = createActorSessionApi(world.sessions),
): TransformerContext => {
  const declaredEvents: WorldEvent[] = [];
  const declaredEventsByType: Map<EventType, WorldEvent[]> = new Map();
  const declaredEventsByCommand: Map<string, WorldEvent[]> = new Map();
  const declaredErrors: ExecutionError[] = [];

  const declareEvent = (input : WorldEvent | WorldEventInput): void => {
    const event: WorldEvent = {
      id: input.id ?? deps.uniqid(),
      ts: input.ts ?? deps.timestamp(),
      ...input
    };

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

  const transformerContext: TransformerContext = {
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
    capacitorApi,
    actorSkillApi,
    actorSessionApi,
    metrics,

    ...deps,
  };

  return map(transformerContext as TransformerContext);
};
