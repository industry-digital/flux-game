import { Ref, ref } from 'vue';
import { createCombatSessionApi, PlaceURN, TransformerContext, WellKnownPlace } from '@flux/core';
import type { CombatSession, ActorSetupData } from '../types';
import { useActorEquipment } from './useActorEquipment';

// Global session state
const session = ref<CombatSession | null>(null);
const sessionApi = ref<any>(null); // Will hold the CombatSessionApi

export type CombatSessionAPI = {
  session: Ref<CombatSession | null>;
  core: Ref<ReturnType<typeof createCombatSessionApi>>;
  startSession: (actors: ActorSetupData[], battlefield: any, weaponSchemas?: any[]) => Promise<void>;
  beginCombat: () => Promise<void>;
  endSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
};

export function useCombatSession(
  context: Ref<TransformerContext>,
  sessionId: Ref<string | null>,
  location: PlaceURN = WellKnownPlace.ORIGIN
): CombatSessionAPI {
  const startSession = async (actors: ActorSetupData[], battlefield: any, weaponSchemas?: any[]): Promise<void> => {
    // Register weapon schemas with the core schema manager if provided
    if (weaponSchemas && weaponSchemas.length > 0) {
      const equipment = useActorEquipment(context.value);
      equipment.registerWeaponSchemas(weaponSchemas);
    }

    // Add actors to the world context
    actors.forEach(actor => {
      context.value.world.actors[actor.id] = actor;
    });

    // Create combat session API - use existing sessionId or let it generate
    sessionApi.value = createCombatSessionApi(
      context.value,
      location,
      sessionId.value as any || undefined, // Use existing sessionId if available
      battlefield, // battlefield
      undefined // initiative - let it compute
    );

    // Update our sessionId ref with the actual session ID (in case it was generated)
    sessionId.value = sessionApi.value.session.id;

    console.log('[useCombatSession] Created session API:', {
      sessionId: sessionApi.value.session.id,
      isNew: sessionApi.value.isNew,
      worldSessionsCount: Object.keys(context.value.world.sessions || {}).length,
      sessionRegistered: !!context.value.world.sessions[sessionApi.value.session.id]
    });

    // Add combatants to the session
    actors.forEach(actor => {
      sessionApi.value.addCombatant(actor.id, actor.team);
    });

    // Update our session reference
    session.value = {
      ...sessionApi.value.session,
      phase: 'setup' as any,
      log: []
    };
  };

  const beginCombat = async (): Promise<void> => {
    if (!sessionApi.value) return;

    console.log('[useCombatSession] Before startCombat:', {
      sessionId: sessionApi.value.session.id,
      sessionStatus: sessionApi.value.session.status,
      worldSessionsCount: Object.keys(context.value.world.sessions || {}).length,
      sessionStillRegistered: !!context.value.world.sessions[sessionApi.value.session.id]
    });

    // Actually start combat using the core API - this sets status to RUNNING
    // The startCombat method returns WorldEvents that we need to capture
    const startEvents = sessionApi.value.startCombat();

    console.log('[useCombatSession] After startCombat:', {
      sessionId: sessionApi.value.session.id,
      sessionStatus: sessionApi.value.session.status,
      startEventsCount: startEvents.length,
      worldSessionsCount: Object.keys(context.value.world.sessions || {}).length,
      sessionStillRegistered: !!context.value.world.sessions[sessionApi.value.session.id]
    });

    // Update our local session reference with the now-running session
    if (session.value) {
      session.value = {
        ...sessionApi.value.session,
        phase: 'active' as any,
        log: [...session.value.log, ...startEvents] // Add the start events to our log
      };
    }
  };

  const endSession = async (): Promise<void> => {
    session.value = null;
    sessionApi.value = null;
    sessionId.value = null; // Clear the session ID
    // Note: We don't null the context - that's owned by the caller
  };

  const pauseSession = async (): Promise<void> => {
    if (session.value && session.value.status === 'running') {
      session.value.phase = 'paused' as any;
    }
  };

  const resumeSession = async (): Promise<void> => {
    if (session.value && session.value.phase === 'paused') {
      session.value.phase = 'active' as any;
    }
  };

  return {
    session,
    core: sessionApi,
    startSession,
    beginCombat,
    endSession,
    pauseSession,
    resumeSession,
  };
}
