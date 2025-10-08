import { ref, computed, readonly } from 'vue';
import { useLogger } from '@flux/ui';
import type {
  TransformerContext,
  WorldEvent,
  ActorURN,
  PlaceURN
} from '@flux/core';
import type { Ref, ComputedRef } from 'vue';

/**
 * Dependencies for useTransformerContext composable
 */
export type TransformerContextDependencies = {
  useLogger: typeof useLogger;
};

export const DEFAULT_TRANSFORMER_CONTEXT_DEPS: Readonly<TransformerContextDependencies> = Object.freeze({
  useLogger,
});

/**
 * Transformer context management API interface
 */
export interface TransformerContextAPI {
  // Reactive state (readonly to prevent external mutation)
  isInitialized: ComputedRef<boolean>;
  eventCount: Readonly<Ref<number>>;

  // Computed world state
  worldState: ComputedRef<any | null>;
  actors: ComputedRef<Record<string, any>>;
  places: ComputedRef<Record<string, any>>;
  declaredEvents: ComputedRef<WorldEvent[]>;
  actorIds: ComputedRef<ActorURN[]>;
  placeIds: ComputedRef<PlaceURN[]>;

  // Actions
  syncEventCount: () => number;
  declareEvent: (event: WorldEvent) => WorldEvent | null;
  declareError: (message: string, eventId?: string) => void;
  addActor: (actor: any) => boolean;
  removeActor: (actorId: ActorURN) => boolean;
  getActor: (actorId: ActorURN) => any;
  hasActor: (actorId: ActorURN) => boolean;
  getEventsSince: (sinceCount: number) => WorldEvent[];
  getLatestEvents: (count: number) => WorldEvent[];
}

/**
 * Reactive wrapper composable for TransformerContext
 *
 * Provides reactive access to world state and event history for an existing context.
 * Does NOT create or manage the context lifecycle - that's the caller's responsibility.
 *
 * Single Responsibility: Reactive wrapper around existing TransformerContext
 */
export function useTransformerContext(
  context: Ref<TransformerContext>,
  deps: TransformerContextDependencies = DEFAULT_TRANSFORMER_CONTEXT_DEPS
): TransformerContextAPI {
  const log = deps.useLogger('useTransformerContext');

  // Reactive state based on the passed context
  const isInitialized = computed(() => !!context.value);
  const eventCount = ref(0);

  // Computed properties
  const worldState = computed(() => context.value?.world || null);
  const actors = computed(() => worldState.value?.actors || {});
  const places = computed(() => worldState.value?.places || {});
  const declaredEvents = computed(() => context.value?.getDeclaredEvents() || []);

  const actorIds = computed(() =>
    Object.keys(actors.value) as ActorURN[]
  );

  const placeIds = computed(() =>
    Object.keys(places.value) as PlaceURN[]
  );


  /**
   * Get current event count and update reactive state
   */
  const syncEventCount = (): number => {
    if (!context.value) return 0;

    const currentCount = context.value.getDeclaredEvents().length;
    eventCount.value = currentCount;
    return currentCount;
  };

  /**
   * Declare an event through the context
   */
  const declareEvent = (event: WorldEvent): WorldEvent | null => {
    if (!context.value) {
      log.warn('Cannot declare event: context not initialized');
      return null;
    }

    try {
      context.value.declareEvent(event);
      syncEventCount();
      log.debug('Event declared:', { type: event.type, id: event.id });
      return event;
    } catch (error) {
      log.error('Failed to declare event:', error);
      return null;
    }
  };

  /**
   * Declare an error through the context
   */
  const declareError = (message: string, eventId?: string): void => {
    if (!context.value) {
      log.warn('Cannot declare error: context not initialized', { message, eventId });
      return;
    }

    try {
      if (eventId) {
        context.value.declareError(message, eventId);
      } else {
        context.value.declareError(message);
      }
      log.debug('Error declared:', { message, eventId });
    } catch (error) {
      log.error('Failed to declare error:', error);
    }
  };

  /**
   * Add an actor to the world state
   */
  const addActor = (actor: any): boolean => {
    if (!context.value) {
      log.warn('Cannot add actor: context not initialized');
      return false;
    }

    try {
      context.value.world.actors[actor.id] = actor;
      log.debug('Actor added to world:', { actorId: actor.id });
      return true;
    } catch (error) {
      log.error('Failed to add actor:', error);
      return false;
    }
  };

  /**
   * Remove an actor from the world state
   */
  const removeActor = (actorId: ActorURN): boolean => {
    if (!context.value) {
      log.warn('Cannot remove actor: context not initialized');
      return false;
    }

    try {
      if (context.value.world.actors[actorId]) {
        delete context.value.world.actors[actorId];
        log.debug('Actor removed from world:', { actorId });
        return true;
      } else {
        log.warn('Actor not found in world:', { actorId });
        return false;
      }
    } catch (error) {
      log.error('Failed to remove actor:', error);
      return false;
    }
  };

  /**
   * Get actor by ID
   */
  const getActor = (actorId: ActorURN) => {
    return actors.value[actorId] || null;
  };

  /**
   * Check if actor exists in world
   */
  const hasActor = (actorId: ActorURN): boolean => {
    return actorId in actors.value;
  };

  /**
   * Get events since a specific count
   */
  const getEventsSince = (sinceCount: number): WorldEvent[] => {
    const allEvents = declaredEvents.value;
    return allEvents.slice(sinceCount);
  };

  /**
   * Get the latest events (last N events)
   */
  const getLatestEvents = (count: number): WorldEvent[] => {
    const allEvents = declaredEvents.value;
    return allEvents.slice(-count);
  };

  return {
    // Reactive state (readonly to prevent external mutation)
    isInitialized,
    eventCount: readonly(eventCount),

    // Computed world state
    worldState,
    actors,
    places,
    declaredEvents,
    actorIds,
    placeIds,

    // Actions
    syncEventCount,
    declareEvent,
    declareError,
    addActor,
    removeActor,
    getActor,
    hasActor,
    getEventsSince,
    getLatestEvents,
  };
}
