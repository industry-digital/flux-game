import { ref, computed, readonly, watch } from 'vue';
import { useLogger } from '~/infrastructure/logging/composables';
import { useCombatLog } from './useCombatLog';
import { useCombatScenario } from './useCombatScenario';
import { useTransformerContext } from './useTransformerContext';
import { useCombatAI, type AITimingConfig } from './useCombatAI';
import {
  type CombatSession,
  type PlaceURN,
  type SessionURN,
  type Actor,
  type WorldEvent,
  createCombatSessionApi,
  createActor,
  isActorAlive,
  ActorURN,
  Stat,
  createShell,
  TransformerContext,
  PotentiallyImpureOperations,
  executeIntent
} from '@flux/core';

/**
 * Combat simulation state
 */
export type CombatSimulationState =
  | 'idle'           // No combat session active
  | 'preparing'      // Setting up combat session
  | 'active'         // Combat is running
  | 'paused'         // Combat is paused
  | 'completed'      // Combat has ended
  | 'error';         // Error occurred

/**
 * Combat simulation configuration
 */
export type CombatSimulationConfig = {
  location: PlaceURN;
  sessionId?: SessionURN;
  aiTiming?: AITimingConfig;
  autoAdvanceTurns?: boolean;
};

/**
 * Dependencies for useCombatSimulator composable
 */
export type CombatSimulatorDependencies = {
  useLogger: typeof useLogger;
  useCombatLog: typeof useCombatLog;
  useCombatScenario: typeof useCombatScenario;
  useTransformerContext: typeof useTransformerContext;
  useCombatAI: typeof useCombatAI;
  createCombatSessionApi: typeof createCombatSessionApi;
  createActor: typeof createActor;
  isActorAlive: typeof isActorAlive;
  executeIntent: typeof executeIntent;
  timestamp: PotentiallyImpureOperations['timestamp'];
};

export const DEFAULT_COMBAT_SIMULATOR_DEPS: CombatSimulatorDependencies = {
  useLogger,
  useCombatLog,
  useCombatScenario,
  useTransformerContext,
  useCombatAI,
  createCombatSessionApi,
  createActor,
  isActorAlive,
  executeIntent,
  timestamp: () => Date.now(),
};

/**
 * Combat Simulator orchestrator composable
 *
 * Orchestrates all combat-related composables and provides a unified API
 * for managing combat simulation lifecycle, turn management, and state coordination.
 *
 * Single Responsibility: Combat simulation orchestration and lifecycle management
 */
export function useCombatSimulator(
  config: CombatSimulationConfig,
  deps: CombatSimulatorDependencies = DEFAULT_COMBAT_SIMULATOR_DEPS
) {
  const log = deps.useLogger('useCombatSimulator');

  // Initialize domain composables
  const combatLog = deps.useCombatLog();
  const scenario = deps.useCombatScenario();
  const transformerContext = deps.useTransformerContext();

  // Reactive simulation state
  const simulationState = ref<CombatSimulationState>('idle');
  const currentSession = ref<CombatSession | null>(null);
  const sessionApi = ref<ReturnType<typeof createCombatSessionApi> | null>(null);
  const lastError = ref<string | null>(null);
  const lastEventId = ref<string | null>(null); // Track last WorldEvent for reactivity

  /**
   * Helper to execute combat actions and capture WorldEvents for reactivity
   */
  const executeWithEventCapture = <T>(
    action: () => T,
    onSuccess?: (result: T, events: WorldEvent[]) => void
  ): { success: boolean; result?: T; events: WorldEvent[] } => {
    if (!transformerContext.context.value) {
      return { success: false, events: [] };
    }

    try {
      const context = transformerContext.context.value;
      const beforeCount = context.getDeclaredEvents().length;

      const result = action();

      const allEvents = context.getDeclaredEvents();
      const newEvents = allEvents.slice(beforeCount);

      if (newEvents.length > 0) {
        const latestEvent = newEvents[newEvents.length - 1];
        lastEventId.value = latestEvent.id;
        combatLog.addEvents(newEvents);
      } else {
        // Fallback trigger for environments where event emission is suppressed
        lastEventId.value = `mock-event-${deps.timestamp()}`;
      }

      if (onSuccess) {
        onSuccess(result, newEvents);
      }

      return { success: true, result, events: newEvents };
    } catch (error) {
      log.error('Combat action failed:', error);
      lastError.value = error instanceof Error ? error.message : String(error);
      return { success: false, events: [] };
    }
  };

  // Initialize AI composable when we have a session
  const combatAI = computed(() => {
    if (!transformerContext.context.value || !currentSession.value) {
      return null;
    }
    return deps.useCombatAI(
      transformerContext.context as any, // Cast to bypass readonly
      currentSession,
      config.aiTiming
    );
  });

  // Reactive state that updates when events occur
  const reactiveState = computed(() => {
    // This computed will re-run whenever lastEventId changes
    const eventId = lastEventId.value;
    const session = currentSession.value;

    if (!session) {
      return {
        hasActiveSession: false,
        currentTurnActor: null,
        combatantCount: 0
      };
    }

    return {
      hasActiveSession: true,
      currentTurnActor: session.data?.rounds?.current?.turns?.current?.actor || null,
      combatantCount: session.data?.combatants?.size || 0,
      eventId // Include eventId to ensure reactivity
    };
  });

  // Computed properties
  const isSimulationActive = computed(() => simulationState.value === 'active');
  const isSimulationPaused = computed(() => simulationState.value === 'paused');
  const canStartSimulation = computed(() => {
    return simulationState.value === 'idle' &&
           transformerContext.isInitialized.value &&
           Object.keys(scenario.scenarioData.value.actors).length > 0;
  });
  const canPauseSimulation = computed(() => simulationState.value === 'active');
  const canResumeSimulation = computed(() => simulationState.value === 'paused');
  const canEndSimulation = computed(() =>
    simulationState.value === 'active' || simulationState.value === 'paused'
  );

  const activeCombatants = computed(() => {
    if (!sessionApi.value) return [];
    return Array.from(sessionApi.value.session.data.combatants.values());
  });

  const aliveCombatants = computed(() => {
    return activeCombatants.value.filter(combatant => {
      const actor = transformerContext.getActor(combatant.actorId);
      return actor ? deps.isActorAlive(actor) : false;
    });
  });

  const currentTurnActor = computed(() => {
    // Use reactiveState to ensure updates when events occur
    return reactiveState.value.currentTurnActor;
  });

  const currentTurn = computed(() => {
    // Access lastEventId to ensure reactivity when events occur
    lastEventId.value;
    return currentSession.value?.data?.rounds?.current?.turns?.current?.number || 0;
  });

  const currentRound = computed(() => {
    // Access lastEventId to ensure reactivity when events occur
    lastEventId.value;
    return currentSession.value?.data?.rounds?.current?.number || 0;
  });

  /**
   * Initialize the transformer context
   */
  const initializeContext = (): boolean => {
    if (transformerContext.isInitialized.value) {
      log.debug('Transformer context already initialized');
      return true;
    }

    const success = transformerContext.initializeContext();
    if (!success) {
      lastError.value = 'Failed to initialize transformer context';
      simulationState.value = 'error';
      return false;
    }

    log.info('Transformer context initialized');
    return true;
  };

  /**
   * Create actors from scenario data and add them to the world
   */
  const createActorsFromScenario = (): Actor[] => {
    if (!transformerContext.context.value) {
      throw new Error('Transformer context not initialized');
    }

    const actors: Actor[] = [];

    for (const [actorId, actorData] of Object.entries(scenario.scenarioData.value.actors)) {
      try {
        // Create actor using core factory with proper data transformation
        const actor = deps.createActor({
          id: actorId as ActorURN,
          name: actorId.split(':').pop() || actorId, // Extract name from URN
          location: config.location,
          // Core stats (stored on actor.stats)
          stats: {
            [Stat.INT]: { nat: actorData.stats.int || 10, eff: actorData.stats.int || 10, mods: {} },
            [Stat.PER]: { nat: actorData.stats.per || 10, eff: actorData.stats.per || 10, mods: {} },
            [Stat.MEM]: { nat: actorData.stats.mem || 10, eff: actorData.stats.mem || 10, mods: {} },
          },
          hp: {
            nat: { max: 100, cur: 100 },
            eff: { max: 100, cur: 100 },
            mods: {}
          },
          // Transform skills from numbers to proper skill objects
          skills: Object.fromEntries(
            Object.entries(actorData.skills || {}).map(([skillId, rank]) => [
              skillId,
              { rank: rank || 0, mods: {}, xp: 0, pxp: 0 }
            ])
          ),
          equipment: {},
          inventory: {
            mass: 1000,
            ts: Date.now(),
            items: {}
          },
          currentShell: 'default-shell',
          // Shell system - shell stats (POW, FIN, RES) are stored here
          shells: {
            'default-shell': createShell({
              id: 'default-shell',
              name: 'Default Shell',
              stats: {
                [Stat.POW]: { nat: actorData.stats.pow || 10, eff: actorData.stats.pow || 10, mods: {} },
                [Stat.FIN]: { nat: actorData.stats.fin || 10, eff: actorData.stats.fin || 10, mods: {} },
                [Stat.RES]: { nat: actorData.stats.res || 10, eff: actorData.stats.res || 10, mods: {} },
              },
            }),
          },
        });

        // Add to transformer context
        transformerContext.addActor(actor);
        actors.push(actor);

        log.debug('Created actor:', { id: actor.id, name: actor.name });
      } catch (error) {
        log.error('Failed to create actor:', { actorData, error });
        throw error;
      }
    }

    return actors;
  };

  /**
   * Start combat simulation
   */
  const startSimulation = (): boolean => {
    // Check basic preconditions first
    if (simulationState.value !== 'idle') {
      log.warn('Cannot start simulation: not in idle state:', simulationState.value);
      return false;
    }

    if (Object.keys(scenario.scenarioData.value.actors).length === 0) {
      log.warn('Cannot start simulation: no actors available');
      return false;
    }

    try {
      // Initialize context if needed first
      if (!initializeContext()) {
        return false;
      }

      // Check if we can start BEFORE changing state to 'preparing'
      if (!canStartSimulation.value) {
        log.warn('Cannot start simulation: preconditions not met');
        return false;
      }

      // Now we can safely set state to preparing
      simulationState.value = 'preparing';
      lastError.value = null;

      // Create actors from scenario
      const actors = createActorsFromScenario();
      if (actors.length === 0) {
        lastError.value = 'No actors available for combat';
        simulationState.value = 'error';
        return false;
      }

      // Create combat session
      const api = deps.createCombatSessionApi(
        transformerContext.context.value! as TransformerContext,
        config.location,
        config.sessionId
      );

      // Add all actors as combatants
      for (const [index, actor] of actors.entries()) {
        // Assign teams alternately: first actor to 'alpha', second to 'bravo', etc.
        const team = index % 2 === 0 ? 'alpha' : 'bravo';
        api.addCombatant(actor.id, team);
      }

      // Use event-based execution for combat start
      const result = executeWithEventCapture(() => {
        // Start combat - this generates WorldEvents
        api.startCombat();
        return api;
      }, (api, events) => {
        // Success callback - update state after events are captured
        currentSession.value = api.session;
        sessionApi.value = api;
        simulationState.value = 'active';

        // Turn/round are now computed from session state automatically

        log.info('Combat simulation started successfully', {
          sessionId: api.session.id,
          combatantCount: actors.length,
          eventsGenerated: events.length
        });
      });

      return result.success;

    } catch (error) {
      log.error('Failed to start simulation:', error);
      lastError.value = error instanceof Error ? error.message : 'Unknown error';
      simulationState.value = 'error';
      return false;
    }
  };

  /**
   * Advance to the next turn
   */
  const advanceTurn = (): boolean => {
    if (!sessionApi.value || !isSimulationActive.value) {
      log.warn('Cannot advance turn: no active session');
      return false;
    }

    try {
      const currentActor = currentTurnActor.value;

      // If current actor is AI-controlled, kick off AI turn asynchronously (do not await)
      if (currentActor && combatAI.value?.isAIControlled(currentActor)) {
        log.debug('Executing AI turn for:', currentActor);
        // Fire-and-forget; AI composable manages its own timing
        void combatAI.value.executeAITurn(currentActor);
      }

      // Use event-based execution for turn advancement
      const result = executeWithEventCapture(() => {
        return sessionApi.value!.advanceTurn('useCombatSimulator.advanceTurn');
      }, () => {
        // Success callback - turn/round are now computed from session state automatically
      });

      if (!result.success) {
        return false;
      }

      // Check victory conditions
      if (sessionApi.value.checkVictoryConditions()) {
        endSimulation();
        return true;
      }

      return true;

    } catch (error) {
      log.error('Failed to advance turn:', error);
      lastError.value = error instanceof Error ? error.message : 'Turn advancement failed';
      return false;
    }
  };

  /**
   * Pause combat simulation
   */
  const pauseSimulation = (): boolean => {
    if (!canPauseSimulation.value) {
      log.warn('Cannot pause simulation in current state:', simulationState.value);
      return false;
    }

    simulationState.value = 'paused';

    // Cancel any ongoing AI execution
    combatAI.value?.cancelAIExecution();

    log.info('Combat simulation paused');
    return true;
  };

  /**
   * Resume combat simulation
   */
  const resumeSimulation = (): boolean => {
    if (!canResumeSimulation.value) {
      log.warn('Cannot resume simulation in current state:', simulationState.value);
      return false;
    }

    simulationState.value = 'active';
    log.info('Combat simulation resumed');
    return true;
  };

  /**
   * End combat simulation
   */
  const endSimulation = (): boolean => {
    if (!canEndSimulation.value) {
      log.warn('Cannot end simulation in current state:', simulationState.value);
      return false;
    }

    try {
      // Cancel AI execution
      combatAI.value?.cancelAIExecution();

      // Use event-based execution for combat end
      if (sessionApi.value) {
        executeWithEventCapture(() => {
          return sessionApi.value!.endCombat('useCombatSimulator.endSimulation');
        });
      }

      // Reset state
      simulationState.value = 'completed';
      currentSession.value = null;
      sessionApi.value = null;
      // currentTurn and currentRound are computed, will be 0 when session is null

      log.info('Combat simulation ended');
      return true;

    } catch (error) {
      log.error('Failed to end simulation:', error);
      lastError.value = error instanceof Error ? error.message : 'Failed to end simulation';
      simulationState.value = 'error';
      return false;
    }
  };

  /**
   * Reset simulation to idle state
   */
  const resetSimulation = (): void => {
    // Cancel AI execution
    combatAI.value?.cancelAIExecution();

    // Reset all state
    simulationState.value = 'idle';
    currentSession.value = null;
    sessionApi.value = null;
    lastError.value = null;
    // currentTurn and currentRound are computed, will be 0 when session is null

    // Reset transformer context
    transformerContext.resetContext();

    // Clear combat log
    combatLog.clearLog();

    log.info('Combat simulation reset');
  };

  /**
   * Get simulation statistics
   */
  const getSimulationStats = () => {
    return {
      state: simulationState.value,
      turn: currentTurn.value,
      round: currentRound.value,
      activeCombatants: activeCombatants.value.length,
      aliveCombatants: aliveCombatants.value.length,
      currentActor: currentTurnActor.value,
      sessionId: currentSession.value?.id,
      lastError: lastError.value,
      aiStats: combatAI.value?.getAIStats() || null
    };
  };

  // Auto-advance turns if configured
  watch([isSimulationActive, currentTurnActor], ([active, actor]) => {
    if (active && actor && config.autoAdvanceTurns && combatAI.value?.isAIControlled(actor)) {
      // Small delay to allow UI updates
      setTimeout(() => {
        if (isSimulationActive.value) {
          advanceTurn();
        }
      }, 100);
    }
  });

  /**
   * Execute a player command using the Universal Intent System
   *
   * @param intentText - Natural language command (e.g., "attack bob", "defend")
   * @returns Array of WorldEvents generated by the command
   */
  const executePlayerCommand = (intentText: string): WorldEvent[] => {
    if (!isSimulationActive.value) {
      log.warn('Cannot execute command: simulation not active');
      return [];
    }

    if (!currentTurnActor.value) {
      log.warn('Cannot execute command: no current turn actor');
      return [];
    }

    if (!transformerContext.context.value) {
      log.warn('Cannot execute command: no transformer context');
      return [];
    }

    // Use synchronous event capture since flux/core is completely synchronous
    const context = transformerContext.context.value! as TransformerContext;
    const actorId = currentTurnActor.value!;

    try {
      // Compute event delta without stubbing declareEvent
      const beforeCount = context.getDeclaredEvents().length;

      // Execute raw intent (resolve + execute); mutates context in-place
      deps.executeIntent(context as any, actorId, intentText);

      const allEvents = context.getDeclaredEvents();
      const newEvents = allEvents.slice(beforeCount);

      if (newEvents.length > 0) {
        const latestEvent = newEvents[newEvents.length - 1];
        lastEventId.value = latestEvent.id;
      } else {
        // Fallback reactivity tick if nothing was emitted
        lastEventId.value = `intent-${deps.timestamp()}`;
      }

      return newEvents;
    } catch (error) {
      log.error('Command execution failed:', error);
      lastError.value = error instanceof Error ? error.message : String(error);
      return [];
    }
  };

  return {
    // Reactive state (readonly to prevent external mutation)
    simulationState: readonly(simulationState),
    currentSession: readonly(currentSession),
    lastError: readonly(lastError),
    currentTurn: readonly(currentTurn),
    currentRound: readonly(currentRound),

    // Computed properties
    isSimulationActive,
    isSimulationPaused,
    canStartSimulation,
    canPauseSimulation,
    canResumeSimulation,
    canEndSimulation,
    activeCombatants,
    aliveCombatants,
    currentTurnActor,

    // Domain composables (readonly access)
    combatLog: {
      entries: combatLog.entries,
      entryCount: combatLog.entryCount,
      filteredEntries: combatLog.filteredEntries,
      addEvents: combatLog.addEvents,
      clearLog: combatLog.clearLog,
    },
    scenario: {
      scenarioData: scenario.scenarioData,
      isLoaded: scenario.isLoaded,
      isDirty: scenario.isDirty,
      lastSaved: scenario.lastSaved,
      updateActorData: scenario.updateActorData,
      addActor: scenario.addActor,
      removeActor: scenario.removeActor,
      resetToDefaults: scenario.resetToDefaults,
    },
    transformerContext: {
      isInitialized: transformerContext.isInitialized,
      eventCount: transformerContext.eventCount,
      actors: transformerContext.actors,
      places: transformerContext.places,
      getActor: transformerContext.getActor,
      hasActor: transformerContext.hasActor,
    },
    combatAI: computed(() => combatAI.value ? {
      aiControlledActors: combatAI.value.aiControlledActors,
      currentThinkingActor: combatAI.value.currentThinkingActor,
      aiExecutionState: combatAI.value.aiExecutionState,
      isAnyAIThinking: combatAI.value.isAnyAIThinking,
      aiActorCount: combatAI.value.aiActorCount,
      setAIControlled: combatAI.value.setAIControlled,
      isAIControlled: combatAI.value.isAIControlled,
      setMultipleAIControlled: combatAI.value.setMultipleAIControlled,
    } : null),

    // Simulation control
    startSimulation,
    advanceTurn,
    pauseSimulation,
    resumeSimulation,
    endSimulation,
    resetSimulation,

    // Command execution (Universal Intent System)
    executePlayerCommand,
    canExecuteCommand: computed(() =>
      isSimulationActive.value && !!currentTurnActor.value
    ),

    // Utilities
    getSimulationStats,

    // Configuration
    config: readonly(ref(config)),
  };
}
