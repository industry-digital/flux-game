import { useState, useCallback, useEffect } from 'react';
import {
  executeIntent,
  type TransformerContext,
  type CombatSession,
  type WorldEvent,
  type ActorURN,
  type PlaceURN,
  type SessionURN,
} from '@flux/core';

export interface CombatState {
  session: CombatSession | null;
  eventCount: number;
}

export interface UseCombatStateResult {
  state: CombatState;
  executeCommand: (command: string) => WorldEvent[];
}

export interface CombatStateDependencies {
  executeIntent: typeof executeIntent;
}

export const DEFAULT_COMBAT_STATE_DEPS: CombatStateDependencies = {
  executeIntent,
};

/**
 * Hook that manages combat session state and command execution
 * Uses the universal intent execution system from @flux/core
 */
export function useCombatState(
  context: TransformerContext,
  initialSession: CombatSession | null,
  currentActorId: ActorURN | null,
  _placeId: PlaceURN,
  _sessionId?: SessionURN | null,
  deps: CombatStateDependencies = DEFAULT_COMBAT_STATE_DEPS
): UseCombatStateResult {
  const [state, setState] = useState<CombatState>({
    session: initialSession,
    eventCount: 0
  });

  // Update internal state when initialSession changes
  useEffect(() => {
    if (initialSession && !state.session) {
      setState({ session: initialSession, eventCount: 0 });
    }
  }, [initialSession, state.session]);

  const executeCommand = useCallback((command: string): WorldEvent[] => {
    // Return early if not initialized
    if (!currentActorId || !state.session) {
      return [];
    }

    try {
      // Capture events count before execution
      const eventsBefore = context.getDeclaredEvents().length;

      // Use the universal intent execution system
      // This automatically handles intent resolution and command execution
      deps.executeIntent(context, currentActorId, command);

      // Calculate events generated
      const eventsAfter = context.getDeclaredEvents().length;
      const newEvents = context.getDeclaredEvents().slice(eventsBefore);

      // Trigger re-render by updating event count
      if (eventsAfter > eventsBefore) {
        setState(prev => ({
          session: prev.session, // Same session object, but mutated by executeIntent
          eventCount: eventsAfter
        }));
      }

      return newEvents;
    } catch (error) {
      console.error('executeCommand failed:', error);
      return [];
    }
  }, [currentActorId, context, state.session, deps]);

  return { state, executeCommand };
}
