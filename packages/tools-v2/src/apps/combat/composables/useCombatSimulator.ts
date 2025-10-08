import { ref, computed, readonly, watch, type Ref, type ComputedRef } from 'vue';
import { useLogger } from '@flux/ui';
import { useCombatLog } from './useCombatLog';
import { useCombatScenario } from './useCombatScenario';
import { useTransformerContext } from './useTransformerContext';
import { useCombatAI, type AITimingConfig } from './useCombatAI';
import {
  type CombatSession as CoreCombatSession,
  type PlaceURN,
  type SessionURN,
  type Actor,
  createCombatSessionApi,
  createActor,
  isActorAlive,
  TransformerContext,
  PotentiallyImpureOperations,
  executeIntent,
  WorldEvent,
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
  useCombatAI: typeof useCombatAI;
  createCombatSessionApi: typeof createCombatSessionApi;
  createActor: typeof createActor;
  isActorAlive: typeof isActorAlive;
  executeIntent: typeof executeIntent;
  timestamp: PotentiallyImpureOperations['timestamp'];
};

export const DEFAULT_COMBAT_SIMULATOR_DEPS: Readonly<CombatSimulatorDependencies> = Object.freeze({
  useLogger,
  useCombatLog,
  useCombatScenario,
  useCombatAI,
  createCombatSessionApi,
  createActor,
  isActorAlive,
  executeIntent,
  timestamp: () => Date.now(),
});

/**
 * Combat Simulator API interface
 */
export interface CombatSimulatorAPI {
  // Reactive state (readonly)
  simulationState: Readonly<Ref<CombatSimulationState>>;
  currentSession: Readonly<Ref<CoreCombatSession | null>>;
  lastError: Readonly<Ref<string | null>>;
  currentTurn: Readonly<Ref<number>>;
  currentRound: Readonly<Ref<number>>;

  // Computed properties
  isSimulationActive: ComputedRef<boolean>;
  isSimulationPaused: ComputedRef<boolean>;
  canStartSimulation: ComputedRef<boolean>;
  canPauseSimulation: ComputedRef<boolean>;
  canResumeSimulation: ComputedRef<boolean>;
  canEndSimulation: ComputedRef<boolean>;
  activeCombatants: ComputedRef<any[]>;
  aliveCombatants: ComputedRef<any[]>;
  currentTurnActor: ComputedRef<string | null>;

  // Domain composables are internal - not exposed to consumers

  // Simulation control
  startSimulation: () => boolean;
  advanceTurn: () => boolean;
  pauseSimulation: () => boolean;
  resumeSimulation: () => boolean;
  endSimulation: () => boolean;
  resetSimulation: () => void;

  // Command execution (Universal Intent System)
  executePlayerCommand: (intentText: string) => WorldEvent[];
  canExecuteCommand: ComputedRef<boolean>;

  // Utilities
  getSimulationStats: () => any;

  // Configuration
  config: Readonly<Ref<CombatSimulationConfig>>;
}

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
  transformerContext: ReturnType<typeof useTransformerContext>,
  deps: CombatSimulatorDependencies = DEFAULT_COMBAT_SIMULATOR_DEPS
): CombatSimulatorAPI {
  const log = deps.useLogger('useCombatSimulator');

  // Initialize domain composables
  const combatLog = deps.useCombatLog();
  const scenario = deps.useCombatScenario();
  // transformerContext is now injected as a required parameter

  // Reactive simulation state
  const simulationState = ref<CombatSimulationState>('idle');
  const currentSession = ref<CoreCombatSession | null>(null);
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
           scenario.availableScenarios.value.length > 0;
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

    // Use the first available scenario as default for now
    const defaultScenario = scenario.availableScenarios.value[0];
    if (!defaultScenario) {
      throw new Error('No scenarios available');
    }

    const actors: Actor[] = [];

    for (const actorData of defaultScenario.actors) {
      try {
        // ActorSetupData extends Actor, so we can use it directly
        const actor = deps.createActor({
          id: actorData.id,
          name: actorData.name,
          location: config.location,
          // Use the actor data directly since it's already properly typed
          stats: actorData.stats,
          hp: actorData.hp,
          skills: actorData.skills,
          equipment: actorData.equipment,
          inventory: actorData.inventory,
          currentShell: actorData.currentShell,
          shells: actorData.shells,
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

    const defaultScenario = scenario.availableScenarios.value[0];
    if (!defaultScenario || defaultScenario.actors.length === 0) {
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
    currentSession: readonly(currentSession) as Readonly<Ref<CoreCombatSession | null>>,
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

    // Domain composables (combatLog, scenario, combatAI) are internal - not exposed

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
