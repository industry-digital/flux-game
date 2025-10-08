import { Ref, ref } from 'vue';
import { createCombatSessionApi, createTransformerContext, PlaceURN, WellKnownPlace } from '@flux/core';
import type { CombatSession, ActorSetupData } from '../types';

// Global session state
const session = ref<CombatSession | null>(null);
const sessionApi = ref<any>(null); // Will hold the CombatSessionApi
const context = ref<any>(null); // Will hold the TransformerContext

export type CombatSessionAPI = {
  session: Ref<CombatSession | null>;
  core: Ref<ReturnType<typeof createCombatSessionApi>>;
  context: Ref<any>;
  startSession: (actors: ActorSetupData[], battlefield: any) => Promise<void>;
  beginCombat: () => Promise<void>;
  endSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
};

export function useCombatSession(location: PlaceURN = WellKnownPlace.ORIGIN): CombatSessionAPI {
  const startSession = async (actors: ActorSetupData[], battlefield: any): Promise<void> => {
    // Create transformer context
    context.value = createTransformerContext();

    // Add actors to the world context
    actors.forEach(actor => {
      context.value.world.actors[actor.id] = actor;
    });

    // Create combat session API
    sessionApi.value = createCombatSessionApi(
      context.value,
      location,
      undefined, // sessionId - let it generate
      battlefield, // battlefield
      undefined // initiative - let it compute
    );

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

    // Update session phase and status
    if (session.value) {
      session.value.phase = 'active' as any;
      // Update the session with the latest data from sessionApi which should have the correct status
      session.value = {
        ...sessionApi.value.session,
        phase: 'active' as any,
        log: session.value.log
      };
    }
  };

  const endSession = async (): Promise<void> => {
    session.value = null;
    sessionApi.value = null;
    context.value = null;
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
    context,
    startSession,
    beginCombat,
    endSession,
    pauseSession,
    resumeSession,
  };
}
