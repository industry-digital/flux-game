import { TransformerContext, WorldScenarioHook } from '@flux/core';
import { ActorURN } from '@flux/core';
import { ReplState } from './types';
// Dependencies will be injected via entrypoint


export const createReplState = (
  context: TransformerContext,
  scenario: WorldScenarioHook,
): ReplState => {
  return {
    context,
    scenario,
    currentActor: undefined, // Start with no actor selected (infrastructure-first approach)
    memo: {
      actors: {
        sessions: new Map(),
        locations: new Map(),
      },
    },
    running: true,
  };
};

// State utility functions for high-performance mutable updates
export const setCurrentActor = (state: ReplState, actorId?: ActorURN): void => {
  state.currentActor = actorId;
};

// These functions will be replaced by direct memo operations in entrypoint
// Keeping for backward compatibility during transition

export const setRunning = (state: ReplState, running: boolean): void => {
  state.running = running;
};
