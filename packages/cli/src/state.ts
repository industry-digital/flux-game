import { TransformerContext } from '@flux/core';
import { createWorldScenario } from '@flux/core';
import { ActorURN } from '@flux/core';
import { ReplMemo, ReplState, ReplStateDependencies } from './types';
// Dependencies will be injected via entrypoint

export const DEFAULT_REPL_STATE_DEPENDENCIES: ReplStateDependencies = {
  createWorldScenario,
};

export const createReplState = (
  context: TransformerContext,
  deps: ReplStateDependencies = DEFAULT_REPL_STATE_DEPENDENCIES,
): ReplState => {
  const scenario = deps.createWorldScenario(context);
  const { world } = context;

  // Create memo structure
  const memo: ReplMemo = {
    actors: {
      actorSessions: new Map(),
      actorLocations: new Map(),
    },
  };

  // Memo will be initialized by entrypoint with injected dependencies

  return {
    context,
    scenario,
    currentActor: undefined, // Start with no actor selected (infrastructure-first approach)
    memo,
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
