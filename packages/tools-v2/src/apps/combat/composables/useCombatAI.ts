import { ref, computed, readonly, watch, type Ref } from 'vue';
import { useLogger } from '@flux/ui';
import {
  type TransformerContext,
  type CombatSession,
  type ActorURN,
  type CombatCommand,
  generateCombatPlan
} from '@flux/core';

/**
 * AI execution state for tracking AI behavior
 */
export type AIExecutionState = 'idle' | 'thinking' | 'executing' | 'error';

/**
 * AI timing configuration for UX
 */
export type AITimingConfig = {
  thinkingDelayMs: number;
  executionDelayMs: number;
};

/**
 * Dependencies for useCombatAI composable
 */
export type CombatAIDependencies = {
  useLogger: typeof useLogger;
  setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearTimeout: (timeout: NodeJS.Timeout) => void;
  generateCombatPlan: typeof generateCombatPlan;
};

export const DEFAULT_COMBAT_AI_DEPS: Readonly<CombatAIDependencies> = Object.freeze({
  useLogger,
  setTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay),
  clearTimeout: (timeout: NodeJS.Timeout) => clearTimeout(timeout),
  generateCombatPlan,
});

/**
 * Default AI timing for UX pacing
 */
export const DEFAULT_AI_TIMING: AITimingConfig = {
  thinkingDelayMs: 1000,
  executionDelayMs: 500,
};

/**
 * Combat AI management composable
 *
 * Handles AI behavior, timing, and integration with the core AI system.
 * Provides reactive AI state management and UX timing for AI actions.
 *
 * Single Responsibility: AI behavior management and UX integration
 */
export function useCombatAI(
  context: Ref<TransformerContext | null>,
  session: Ref<CombatSession | null>,
  timingConfig: AITimingConfig = DEFAULT_AI_TIMING,
  deps: CombatAIDependencies = DEFAULT_COMBAT_AI_DEPS
) {
  const log = deps.useLogger('useCombatAI');

  // Reactive AI state
  const aiControlledActors = ref<Set<ActorURN>>(new Set());
  const currentThinkingActor = ref<ActorURN | null>(null);
  const aiExecutionState = ref<AIExecutionState>('idle');
  const lastExecutedActor = ref<ActorURN | null>(null);

  // Timeout management
  const activeTimeouts = ref<Set<NodeJS.Timeout>>(new Set());

  // Computed properties
  const isAnyAIThinking = computed(() => currentThinkingActor.value !== null);
  const aiControlledActorsList = computed(() => Array.from(aiControlledActors.value));
  const aiActorCount = computed(() => aiControlledActors.value.size);

  /**
   * Set AI control status for an actor
   */
  const setAIControlled = (actorId: ActorURN, isAI: boolean): void => {
    if (isAI) {
      aiControlledActors.value.add(actorId);
    } else {
      aiControlledActors.value.delete(actorId);
      // Clear thinking state if this actor was thinking
      if (currentThinkingActor.value === actorId) {
        currentThinkingActor.value = null;
        aiExecutionState.value = 'idle';
      }
    }

    log.debug('AI control updated:', { actorId, isAI, totalAIActors: aiControlledActors.value.size });
  };

  /**
   * Check if an actor is AI-controlled
   */
  const isAIControlled = (actorId: ActorURN): boolean => {
    return aiControlledActors.value.has(actorId);
  };

  /**
   * Clear all active timeouts
   */
  const clearAllTimeouts = (): void => {
    activeTimeouts.value.forEach(timeout => {
      deps.clearTimeout(timeout);
    });
    activeTimeouts.value.clear();
  };

  /**
   * Execute AI turn for the specified actor
   */
  const executeAITurn = async (actorId: ActorURN): Promise<CombatCommand[]> => {
    if (!isAIControlled(actorId)) {
      log.warn(`Attempted to execute AI turn for non-AI actor: ${actorId}`);
      return [];
    }

    // Prevent multiple executions for the same actor
    if (lastExecutedActor.value === actorId) {
      log.debug('AI turn already executed for actor:', { actorId });
      return [];
    }

    // Set thinking state
    currentThinkingActor.value = actorId;
    aiExecutionState.value = 'thinking';
    lastExecutedActor.value = actorId;

    log.debug('AI turn started:', {
      actorId,
      thinkingDelay: timingConfig.thinkingDelayMs
    });

    return new Promise((resolve) => {
      // Thinking delay for UX
      const thinkingTimeout = deps.setTimeout(() => {
        activeTimeouts.value.delete(thinkingTimeout);

        try {
          aiExecutionState.value = 'executing';

          // Get the combatant for this actor
          const currentSession = session.value;
          const currentContext = context.value;

          if (!currentSession || !currentContext) {
            log.error('Session or context not available for AI execution');
            aiExecutionState.value = 'error';
            currentThinkingActor.value = null;
            resolve([]);
            return;
          }

          const combatant = currentSession.data.combatants.get(actorId);
          if (!combatant) {
            log.error(`Combatant not found for actor: ${actorId}`);
            aiExecutionState.value = 'error';
            currentThinkingActor.value = null;
            resolve([]);
            return;
          }

          // Generate combat plan using core AI system
          const commands = deps.generateCombatPlan(
            currentContext,
            currentSession,
            combatant,
            currentContext.uniqid()
          );

          log.debug('AI plan generated:', {
            actorId,
            commandCount: commands.length,
            commands: commands.map(cmd => cmd.type)
          });

          // Execution delay for UX
          const executionTimeout = deps.setTimeout(() => {
            activeTimeouts.value.delete(executionTimeout);

            aiExecutionState.value = 'idle';
            currentThinkingActor.value = null;

            log.debug('AI turn completed:', { actorId, commandCount: commands.length });
            resolve(commands);
          }, timingConfig.executionDelayMs);

          activeTimeouts.value.add(executionTimeout);

        } catch (error) {
          log.error('AI execution failed:', error);
          aiExecutionState.value = 'error';
          currentThinkingActor.value = null;
          resolve([]);
        }
      }, timingConfig.thinkingDelayMs);

      activeTimeouts.value.add(thinkingTimeout);
    });
  };

  /**
   * Cancel current AI execution
   */
  const cancelAIExecution = (): void => {
    clearAllTimeouts();
    currentThinkingActor.value = null;
    aiExecutionState.value = 'idle';
    log.debug('AI execution cancelled');
  };

  /**
   * Reset AI state (useful when combat ends or resets)
   */
  const resetAIState = (): void => {
    cancelAIExecution();
    lastExecutedActor.value = null;
    log.debug('AI state reset');
  };

  /**
   * Set multiple AI-controlled actors at once
   */
  const setMultipleAIControlled = (actorConfigs: Array<{
    actorId: ActorURN;
    isAI: boolean;
  }>): void => {
    actorConfigs.forEach(({ actorId, isAI }) => {
      setAIControlled(actorId, isAI);
    });
  };

  /**
   * Get AI statistics for debugging/UI
   */
  const getAIStats = () => {
    return {
      totalAIActors: aiActorCount.value,
      currentThinking: currentThinkingActor.value,
      executionState: aiExecutionState.value,
      lastExecuted: lastExecutedActor.value,
      activeTimeouts: activeTimeouts.value.size,
      timingConfig
    };
  };

  // Cleanup timeouts when component unmounts
  const cleanup = (): void => {
    clearAllTimeouts();
  };

  // Watch for session changes to reset state
  watch(() => session.value?.id, () => {
    resetAIState();
  });

  return {
    // Reactive state (readonly to prevent external mutation)
    aiControlledActors: readonly(aiControlledActors),
    currentThinkingActor: readonly(currentThinkingActor),
    aiExecutionState: readonly(aiExecutionState),

    // Computed properties
    isAnyAIThinking,
    aiControlledActorsList,
    aiActorCount,

    // AI control management
    setAIControlled,
    isAIControlled,
    setMultipleAIControlled,

    // AI execution
    executeAITurn,
    cancelAIExecution,
    resetAIState,

    // Utilities
    getAIStats,
    cleanup,

    // Configuration
    timingConfig,
  };
}
