import { useState, useCallback, useEffect } from 'react';
import {
  createCombatSessionApi,
  type CombatSessionApi,
  type TransformerContext,
  type CombatSession,
  type ActorURN,
  type PlaceURN,
  type SessionURN,
  type WorldEvent,
  Team,
  SessionStatus,
  EventType,
  type CombatTurnDidStart,
} from '@flux/core';
import { DEFAULT_COMBAT_SESSION_ID } from '../constants';

export interface UseCombatSessionResult {
  session: CombatSession | null;
  sessionId: SessionURN | null;
  isInSetupPhase: boolean;
  isPaused: boolean;
  isRunning: boolean;
  currentActorId: ActorURN | null;
  startCombat: () => WorldEvent[];
  pauseCombat: () => WorldEvent[];
  resumeCombat: () => WorldEvent[];
  advanceTurn: (trace?: string) => WorldEvent[];
  addCombatant: (actorId: ActorURN, team: Team | string) => void;
  removeCombatant: (actorId: ActorURN) => void;
  processNewEvents: () => void;
}

export interface CombatSessionDependencies {
  createCombatSessionApi: typeof createCombatSessionApi;
}

export const DEFAULT_COMBAT_SESSION_DEPS: CombatSessionDependencies = {
  createCombatSessionApi,
};

/**
 * Hook for managing combat session lifecycle and phase transitions
 * Handles setup → active → paused states and combatant management
 */
export function useCombatSession(
  context: TransformerContext,
  placeId: PlaceURN,
  deps: CombatSessionDependencies = DEFAULT_COMBAT_SESSION_DEPS
): UseCombatSessionResult {
  const [session, setSession] = useState<CombatSession | null>(null);
  const [sessionId, setSessionId] = useState<SessionURN | null>(null);
  const [currentActorId, setCurrentActorId] = useState<ActorURN | null>(null);
  const [sessionApi, setSessionApi] = useState<CombatSessionApi | null>(null);
  const [lastProcessedEventId, setLastProcessedEventId] = useState<string | null>(null);

  // Derived state
  const isInSetupPhase = !session || session.status === SessionStatus.PENDING;
  const isPaused = session?.status === SessionStatus.PAUSED;
  const isRunning = session?.status === SessionStatus.RUNNING;

  // Initialize session API with the provided context
  useEffect(() => {
    if (!sessionApi) {
      const api = deps.createCombatSessionApi(context, placeId, DEFAULT_COMBAT_SESSION_ID);
      setSessionApi(api);
      setSession(api.session);
      setSessionId(api.session.id);

      // Set the initial current actor from the session
      const initialCurrentActor = api.session.data.currentTurn.actor;
      setCurrentActorId(initialCurrentActor);
    }
  }, [context, placeId, sessionApi, deps]);

  // Extract event processing logic into a separate function
  const processNewEvents = useCallback(() => {
    if (!session) return;

    // Get all declared events and look for turn events
    const allEvents = context.getDeclaredEvents();


    if (allEvents.length === 0) return;

    // Find the most recent event ID to track what we've processed
    const latestEvent = allEvents[allEvents.length - 1];

    // Skip if we've already processed this event
    if (latestEvent.id === lastProcessedEventId) {
      return;
    }

    // Look for turn start events for this session that we haven't processed yet
    const newTurnEvents = allEvents.filter(event =>
      event.type === EventType.COMBAT_TURN_DID_START &&
      event.id !== lastProcessedEventId
    ) as CombatTurnDidStart[];

    if (newTurnEvents.length > 0) {
      // Use the most recent turn started event
      const latestTurnEvent = newTurnEvents[newTurnEvents.length - 1];
      const newActorId = latestTurnEvent.payload.turnActor;

      if (newActorId && newActorId !== currentActorId) {
        setCurrentActorId(newActorId);
      }
    }

    // Update the last processed event ID
    setLastProcessedEventId(latestEvent.id);
  }, [session, currentActorId, lastProcessedEventId, context]);

  // Process events on initial load and when dependencies change
  useEffect(() => {
    processNewEvents();
  }, [processNewEvents]);

  const startCombat = useCallback((): WorldEvent[] => {
    if (!sessionApi || !isInSetupPhase) return [];

    try {
      // Start combat and capture events
      const events = sessionApi.startCombat();

      // Get the first actor from initiative order
      const firstActorId = session?.data.initiative.keys().next().value as ActorURN;
      setCurrentActorId(firstActorId);

      // Session status is updated by the API
      setSession({ ...sessionApi.session });

      // Return events for the combat log
      return events;
    } catch (error) {
      console.error('❌ Combat start failed:', error);
      return [];
    }
  }, [sessionApi, isInSetupPhase, session]);

  const pauseCombat = useCallback((): WorldEvent[] => {
    if (!sessionApi || !isRunning) return [];

    try {
      // Note: pauseCombat method would need to be added to CombatSessionApi
      // For now, we'll manually update the session status
      if (session) {
        session.status = SessionStatus.PAUSED;
        setSession({ ...session });
      }
      return [];
    } catch (error) {
      console.error('❌ Combat pause failed:', error);
      return [];
    }
  }, [sessionApi, isRunning, session]);

  const resumeCombat = useCallback((): WorldEvent[] => {
    if (!sessionApi || !isPaused) return [];

    try {
      // Note: resumeCombat method would need to be added to CombatSessionApi
      // For now, we'll manually update the session status
      if (session) {
        session.status = SessionStatus.RUNNING;
        setSession({ ...session });
      }
      return [];
    } catch (error) {
      console.error('❌ Combat resume failed:', error);
      return [];
    }
  }, [sessionApi, isPaused, session]);

  const advanceTurn = useCallback((trace?: string): WorldEvent[] => {
    if (!sessionApi) return [];

    try {
      const events = sessionApi.advanceTurn(trace);

      // Update current actor from session state
      const newActorId = session?.data.currentTurn.actor;
      if (newActorId) {
        setCurrentActorId(newActorId);
      }

      // Update session reference
      setSession({ ...sessionApi.session });

      return events;
    } catch (error) {
      console.error('❌ Turn advancement failed:', error);
      return [];
    }
  }, [sessionApi, session]);

  const addCombatant = useCallback((actorId: ActorURN, team: Team | string) => {
    if (!sessionApi || !isInSetupPhase) return;

    try {
      sessionApi.addCombatant(actorId, team);
      setSession({ ...sessionApi.session });
    } catch (error) {
      console.error('❌ Add combatant failed:', error);
    }
  }, [sessionApi, isInSetupPhase]);

  const removeCombatant = useCallback((actorId: ActorURN) => {
    if (!sessionApi || !isInSetupPhase) return;

    try {
      sessionApi.removeCombatant(actorId);
      setSession({ ...sessionApi.session });
    } catch (error) {
      console.error('❌ Remove combatant failed:', error);
    }
  }, [sessionApi, isInSetupPhase]);

  return {
    session,
    sessionId,
    isInSetupPhase,
    isPaused,
    isRunning,
    currentActorId,
    startCombat,
    pauseCombat,
    resumeCombat,
    advanceTurn,
    addCombatant,
    removeCombatant,
    processNewEvents,
  };
}
