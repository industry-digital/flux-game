import { useState, useCallback, useRef, useEffect } from 'react';
import {
  generateCombatPlan,
  type ActorURN,
  type TransformerContext,
  type CombatSession,
  type WorldEvent,
  EventType,
} from '@flux/core';
import type { UseCombatStateResult } from '~/apps/combat/hooks/useCombatState';


export interface UseAiControlResult {
  aiThinking: ActorURN | null;
  setAiThinking: (actorId: ActorURN | null) => void;
  executeAiTurn: (actorId: ActorURN) => WorldEvent[];
}

export interface AiControlDependencies {
  generateCombatPlan: typeof generateCombatPlan;
  setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearTimeout: (timeout: NodeJS.Timeout) => void;
}

export const DEFAULT_AI_CONTROL_DEPS: Omit<AiControlDependencies, 'executeCommand'> = {
  generateCombatPlan,
  setTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay),
  clearTimeout: (timeout: NodeJS.Timeout) => clearTimeout(timeout),
};

export const createUseAiControl = (deps: AiControlDependencies = DEFAULT_AI_CONTROL_DEPS) => {

  /**
   * Hook for managing AI control execution and thinking indicators
   * AI control state is now managed externally (single source of truth)
   *
   * @param aiControlled - Record of which actors are AI-controlled (from external state)
   * @param executeCommand - Function from useCombatState that handles intent execution
   */
  return function useAiControl(
    context: TransformerContext,
    session: CombatSession | null,
    currentActorId: ActorURN | null,
    aiControlled: Record<ActorURN, boolean>,
    onEventsGenerated: (events: WorldEvent[]) => void,
    executeCommand: UseCombatStateResult['executeCommand'],
  ): UseAiControlResult {
    const [aiThinking, setAiThinking] = useState<ActorURN | null>(null);

    const aiExecutingRef = useRef<ActorURN | null>(null);
    const aiTimerRef = useRef<NodeJS.Timeout | null>(null);

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
          // Dump the errors from the context:
          console.warn(`No AI plan generated for ${actorId}`, {
            actorId,
            hp: actor.hp.eff.cur,
            ap: currentCombatant.ap.eff.cur,
            team: currentCombatant.team,
            combatantsCount: session.data.combatants.size,
            combatantIds: Array.from(session.data.combatants.keys()),
          });
          console.log('errors!', context.getDeclaredErrors());
          return [];
        }

        // Execute AI actions using direct command execution from useCombatState
        // Accumulate events from each command execution
        const allEvents: WorldEvent[] = [];
        for (const command of aiPlan) {
          const commandEvents = executeCommand(command);
          allEvents.push(...commandEvents);
        }

        // Return all accumulated events from this AI turn
        return allEvents;
      } catch (error) {
        console.error(`AI execution failed for ${actorId}:`, error);
        return [];
      }
    }, [context, session, executeCommand]);

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

        // Check if turn ended by looking for COMBAT_TURN_DID_END event
        const turnEndEvent = events.find(event => event.type === EventType.COMBAT_TURN_DID_END);
        if (turnEndEvent) {
          // Turn properly ended, clear AI state
          setAiThinking(null);
          aiExecutingRef.current = null;
          aiTimerRef.current = null;
        } else {
          // Turn didn't end properly - this indicates a bug in AI planning
          console.warn(`AI turn for ${currentActorId} did not end properly - no COMBAT_TURN_DID_END event found`);
          setAiThinking(null);
          aiExecutingRef.current = null;
          aiTimerRef.current = null;
        }
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
    }, [currentActorId, aiControlled, context, session, executeAiTurn, onEventsGenerated]);

    return {
      aiThinking,
      setAiThinking,
      executeAiTurn,
    };
  }
}

export const useAiControl = createUseAiControl();
