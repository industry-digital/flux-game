import { shallowRef, ref, computed, readonly, markRaw } from 'vue';
import { useLogger } from '@flux/ui';
import { createTransformerContext } from '@flux/core';
import type {
  TransformerContext,
  WorldEvent,
  ActorURN,
  PlaceURN
} from '@flux/core';

/**
 * Dependencies for useTransformerContext composable
 */
export type TransformerContextDependencies = {
  useLogger: typeof useLogger;
  createTransformerContext: typeof createTransformerContext;
};

export const DEFAULT_TRANSFORMER_CONTEXT_DEPS: Readonly<TransformerContextDependencies> = Object.freeze({
  useLogger,
  createTransformerContext,
});

/**
 * Transformer context management composable
 *
 * Handles world state management, event tracking, and context lifecycle.
 * Provides reactive access to world state and event history.
 *
 * Single Responsibility: TransformerContext lifecycle and world state management
 */
export function useTransformerContext(
  deps: TransformerContextDependencies = DEFAULT_TRANSFORMER_CONTEXT_DEPS
) {
  const log = deps.useLogger('useTransformerContext');

  // Reactive state
  const context = shallowRef<TransformerContext | null>(null);
  const isInitialized = ref(false);
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
   * Initialize a new transformer context
   */
  const initializeContext = (): boolean => {
    try {
      log.debug('Initializing transformer context');

      const newContext = deps.createTransformerContext();
      // Keep core context non-reactive for in-place mutation performance
      context.value = markRaw(newContext as unknown as TransformerContext);
      isInitialized.value = true;
      eventCount.value = 0;

      log.info('Transformer context initialized successfully');
      return true;
    } catch (error) {
      log.error('Failed to initialize transformer context:', error);
      return false;
    }
  };

  /**
   * Reset the context to a fresh state
   */
  const resetContext = (): boolean => {
    log.debug('Resetting transformer context');

    context.value = null;
    isInitialized.value = false;
    eventCount.value = 0;

    return initializeContext();
  };

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
    context: readonly(context),
    isInitialized: readonly(isInitialized),
    eventCount: readonly(eventCount),

    // Computed world state
    worldState,
    actors,
    places,
    declaredEvents,
    actorIds,
    placeIds,

    // Actions
    initializeContext,
    resetContext,
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
