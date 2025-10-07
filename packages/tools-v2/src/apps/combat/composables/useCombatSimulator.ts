import { ref, computed, readonly, watch } from 'vue';
import { useLogger } from '~/infrastructure/logging/composables';
import { useCombatLog } from './useCombatLog';
import { useCombatScenario } from './useCombatScenario';
import { useTransformerContext } from './useTransformerContext';
import { useCombatAI, type AITimingConfig } from './useCombatAI';
import {
  type CombatSession, type PlaceURN,
  type SessionURN, type Actor,
  createCombatSessionApi,
  createActor,
  isActorAlive
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
  const currentTurn = ref(0);
  const currentRound = ref(0);

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

  // Computed properties
  const isSimulationActive = computed(() => simulationState.value === 'active');
  const isSimulationPaused = computed(() => simulationState.value === 'paused');
  const canStartSimulation = computed(() => {
    return simulationState.value === 'idle' &&
           transformerContext.isInitialized.value &&
           scenario.scenarioData.value.actors.length > 0;
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
    if (!sessionApi.value) return null;
    const session = sessionApi.value.session;
    return session.data.turnOrder[session.data.currentTurnIndex] || null;
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

    for (const actorData of scenario.scenarioData.value.actors) {
      try {
        // Create actor using core factory
        const actor = deps.createActor({
          id: actorData.id,
          name: actorData.name,
          location: config.location,
          stats: actorData.stats,
          hp: actorData.hp,
          skills: actorData.skills || {},
          equipment: actorData.equipment || {},
          inventory: actorData.inventory || {
            mass: 1000,
            ts: Date.now(),
            items: {}
          }
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
  const startSimulation = async (): Promise<boolean> => {
    if (!canStartSimulation.value) {
      log.warn('Cannot start simulation in current state:', simulationState.value);
      return false;
    }

    try {
      simulationState.value = 'preparing';
      lastError.value = null;

      // Initialize context if needed
      if (!initializeContext()) {
        return false;
      }

      // Create actors from scenario
      const actors = createActorsFromScenario();
      if (actors.length === 0) {
        lastError.value = 'No actors available for combat';
        simulationState.value = 'error';
        return false;
      }

      // Create combat session
      const api = deps.createCombatSessionApi(
        transformerContext.context.value!,
        config.location,
        config.sessionId
      );

      // Add all actors as combatants
      for (const actor of actors) {
        api.addCombatant(actor.id);
      }

      // Start combat
      api.startCombat();

      currentSession.value = api.session;
      sessionApi.value = api;
      simulationState.value = 'active';
      currentTurn.value = 1;
      currentRound.value = 1;

      // Log combat start
      combatLog.addEvents([
        {
          id: transformerContext.context.value!.uniqid(),
          type: 'COMBAT_STARTED',
          ts: Date.now(),
          actor: null,
          location: config.location,
          data: {
            sessionId: api.session.id,
            combatantCount: actors.length
          }
        }
      ]);

      log.info('Combat simulation started:', {
        sessionId: api.session.id,
        combatants: actors.length
      });

      return true;

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
  const advanceTurn = async (): Promise<boolean> => {
    if (!sessionApi.value || !isSimulationActive.value) {
      log.warn('Cannot advance turn: no active session');
      return false;
    }

    try {
      const currentActor = currentTurnActor.value;

      // Check if current actor is AI-controlled
      if (currentActor && combatAI.value?.isAIControlled(currentActor)) {
        log.debug('Executing AI turn for:', currentActor);

        // Execute AI turn
        const commands = await combatAI.value.executeAITurn(currentActor);

        // Execute commands (this would integrate with the Universal Intent System)
        for (const command of commands) {
          log.debug('Executing AI command:', command);
          // TODO: Integrate with Universal Intent System
        }
      }

      // Advance turn in session
      const events = sessionApi.value.advanceTurn('useCombatSimulator.advanceTurn');

      // Log events
      if (events.length > 0) {
        combatLog.addEvents(events);
      }

      // Update turn/round counters
      currentTurn.value++;
      if (sessionApi.value.session.data.currentTurnIndex === 0) {
        currentRound.value++;
      }

      // Check victory conditions
      if (sessionApi.value.checkVictoryConditions()) {
        await endSimulation();
        return true;
      }

      log.debug('Turn advanced:', {
        turn: currentTurn.value,
        round: currentRound.value,
        currentActor: currentTurnActor.value
      });

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
  const endSimulation = async (): Promise<boolean> => {
    if (!canEndSimulation.value) {
      log.warn('Cannot end simulation in current state:', simulationState.value);
      return false;
    }

    try {
      // Cancel AI execution
      combatAI.value?.cancelAIExecution();

      // End combat session if active
      if (sessionApi.value) {
        const events = sessionApi.value.endCombat('useCombatSimulator.endSimulation');
        if (events.length > 0) {
          combatLog.addEvents(events);
        }
      }

      // Log combat end
      if (transformerContext.context.value) {
        combatLog.addEvents([
          {
            id: transformerContext.context.value.uniqid(),
            type: 'COMBAT_ENDED',
            ts: Date.now(),
            actor: null,
            location: config.location,
            data: {
              sessionId: currentSession.value?.id,
              turns: currentTurn.value,
              rounds: currentRound.value
            }
          }
        ]);
      }

      // Reset state
      simulationState.value = 'completed';
      currentSession.value = null;
      sessionApi.value = null;
      currentTurn.value = 0;
      currentRound.value = 0;

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
    currentTurn.value = 0;
    currentRound.value = 0;

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
  watch([isSimulationActive, currentTurnActor], async ([active, actor]) => {
    if (active && actor && config.autoAdvanceTurns && combatAI.value?.isAIControlled(actor)) {
      // Small delay to allow UI updates
      setTimeout(() => {
        if (isSimulationActive.value) {
          advanceTurn();
        }
      }, 100);
    }
  });

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
      events: combatLog.events,
      eventCount: combatLog.eventCount,
      categorizedEvents: combatLog.categorizedEvents,
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

    // Utilities
    getSimulationStats,

    // Configuration
    config: readonly(ref(config)),
  };
}
