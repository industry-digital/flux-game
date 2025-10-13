import { useState, useCallback, useRef, useEffect } from 'react';
import {
  generateCombatPlan,
  executeIntent,
  type ActorURN,
  type TransformerContext,
  type CombatSession,
  type WorldEvent,
} from '@flux/core';

export interface UseAiControlResult {
  aiControlled: Record<ActorURN, boolean>;
  aiThinking: ActorURN | null;
  setAiControlled: (actorId: ActorURN, enabled: boolean) => void;
  setAiThinking: (actorId: ActorURN | null) => void;
  executeAiTurn: (actorId: ActorURN) => WorldEvent[];
}

export interface AiControlDependencies {
  generateCombatPlan: typeof generateCombatPlan;
  executeIntent: typeof executeIntent;
  setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearTimeout: (timeout: NodeJS.Timeout) => void;
}

export const DEFAULT_AI_CONTROL_DEPS: AiControlDependencies = {
  generateCombatPlan,
  executeIntent,
  setTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay),
  clearTimeout: (timeout: NodeJS.Timeout) => clearTimeout(timeout),
};

/**
 * Hook for managing AI control state and execution
 * Handles AI thinking indicators and automated turn execution
 */
export function useAiControl(
  context: TransformerContext,
  session: CombatSession | null,
  currentActorId: ActorURN | null,
  onEventsGenerated: (events: WorldEvent[]) => void,
  deps: AiControlDependencies = DEFAULT_AI_CONTROL_DEPS
): UseAiControlResult {
  const [aiControlled, setAiControlledState] = useState<Record<ActorURN, boolean>>({});
  const [aiThinking, setAiThinking] = useState<ActorURN | null>(null);

  const aiExecutingRef = useRef<ActorURN | null>(null);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setAiControlled = useCallback((actorId: ActorURN, enabled: boolean) => {
    setAiControlledState(prev => ({
      ...prev,
      [actorId]: enabled
    }));
  }, []);

  const executeAiTurn = useCallback((actorId: ActorURN): WorldEvent[] => {
    if (!session) return [];

    try {
      const currentCombatant = session.data.combatants.get(actorId);
      if (!currentCombatant) {
        console.warn(`Combatant not found: ${actorId}`);
        return [];
      }

      // Check if actor is alive
      const actor = context.world.actors[actorId];
      if (!actor || actor.hp.eff.cur <= 0) {
        console.warn(`Actor is dead or not found: ${actorId}`);
        return [];
      }

      // Generate AI combat plan
      const aiPlan = deps.generateCombatPlan(
        context,
        session,
        currentCombatant,
        `ai-turn-${actorId}`,
      );

      if (aiPlan.length === 0) {
        console.warn(`No AI plan generated for ${actorId}`);
        return [];
      }

      // Capture events before AI execution
      const eventsBefore = context.getDeclaredEvents().length;

      // Execute AI actions using the universal intent execution system
      // The AI plan contains commands, but we need to convert them to intents
      // For now, we'll execute a simple "strike" intent as a placeholder
      deps.executeIntent(context, actorId, "strike");

      // Calculate events generated
      const _eventsAfter = context.getDeclaredEvents().length;
      const newEvents = context.getDeclaredEvents().slice(eventsBefore);

      return newEvents;
    } catch (error) {
      console.error(`AI execution failed for ${actorId}:`, error);
      return [];
    }
  }, [context, session, deps]);

  // Auto-execute AI turns with delay
  useEffect(() => {
    // Only execute AI actions during active combat
    if (!currentActorId || !session) {
      aiExecutingRef.current = null;
      return;
    }

    // Check if current actor is AI-controlled
    const isCurrentActorAI = aiControlled[currentActorId];
    if (!isCurrentActorAI) {
      aiExecutingRef.current = null;
      return;
    }

    // Check if current actor is alive
    const currentActor = context.world.actors[currentActorId];
    if (!currentActor || currentActor.hp.eff.cur <= 0) {
      aiExecutingRef.current = null;
      return;
    }

    // Prevent multiple executions for the same turn
    if (aiExecutingRef.current === currentActorId) {
      return;
    }

    // Mark this actor as executing and set AI thinking state
    aiExecutingRef.current = currentActorId;
    setAiThinking(currentActorId);

    const aiExecutionTimer = deps.setTimeout(() => {
      const events = executeAiTurn(currentActorId);
      onEventsGenerated(events);

      // Clear AI thinking state and execution tracking
      setAiThinking(null);
      aiExecutingRef.current = null;
      aiTimerRef.current = null;
    }, 1000); // 1 second delay for better UX

    // Store timer reference for potential cancellation
    aiTimerRef.current = aiExecutionTimer;

    // Cleanup timer on unmount or dependency change
    return () => {
      if (aiTimerRef.current) {
        deps.clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      setAiThinking(null);
      aiExecutingRef.current = null;
    };
  }, [currentActorId, aiControlled, context, session, executeAiTurn, onEventsGenerated, deps]);

  return {
    aiControlled,
    aiThinking,
    setAiControlled,
    setAiThinking,
    executeAiTurn,
  };
}
