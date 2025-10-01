import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUndoStagedMutationsAction } from './undo';
import { ActorStat } from '~/types/entity/actor';
import { StatMutationOperation } from '~/types/workbench';
import { EventType } from '~/types/event';
import { createStatMutation, createMockWorkbenchContext, useSimpleWorkbenchScenario } from '../testing';
import { ActorURN } from '~/types/taxonomy';

describe('undoStagedMutations', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = createMockWorkbenchContext();
  });

  it('should undo staged mutations and return success event', () => {
    // Create a workbench scenario with pending mutations
    const scenario = useSimpleWorkbenchScenario(mockContext, {
      name: 'Test Actor',
      pendingMutations: [
        createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 5),
      ],
    });

    const actorId = Object.keys(scenario.actors)[0] as ActorURN;
    const { actor, hooks } = scenario.actors[actorId];

    // Create the undo action
    const undoStagedMutations = createUndoStagedMutationsAction(mockContext, hooks.session.session, actor);

    const events = undoStagedMutations();

    // Should return one event
    expect(events).toHaveLength(1);

    // Should be the correct event type
    expect(events[0].type).toBe(EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE);

    // Should have correct payload
    expect(events[0].payload).toEqual({
      session: hooks.session.session.id,
    });

    // Should have correct metadata
    expect(events[0].actor).toBe(actor.id);
    expect(events[0].location).toBe(actor.location);

    // Should clear all pending mutations
    expect(hooks.session.session.data.pendingMutations).toHaveLength(0);
  });

  it('should handle multiple staged mutations', () => {
    // Create a workbench scenario with multiple pending mutations
    const scenario = useSimpleWorkbenchScenario(mockContext, {
      name: 'Test Actor',
      pendingMutations: [
        createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 5),
        createStatMutation(ActorStat.FIN, StatMutationOperation.REMOVE, 2),
      ],
    });

    const actorId = Object.keys(scenario.actors)[0] as ActorURN;
    const { actor, hooks } = scenario.actors[actorId];

    // Create the undo action
    const undoStagedMutations = createUndoStagedMutationsAction(mockContext, hooks.session.session, actor);

    const events = undoStagedMutations();

    // Should return one event
    expect(events).toHaveLength(1);

    // Should clear all pending mutations
    expect(hooks.session.session.data.pendingMutations).toHaveLength(0);
  });

  it('should reject undo when no mutations are staged', () => {
    const declareErrorSpy = vi.fn();
    mockContext.declareError = declareErrorSpy;

    // Create a workbench scenario with no pending mutations
    const scenario = useSimpleWorkbenchScenario(mockContext, {
      name: 'Test Actor',
      pendingMutations: [], // No mutations
    });

    const actorId = Object.keys(scenario.actors)[0] as ActorURN;
    const { actor, hooks } = scenario.actors[actorId];

    // Create the undo action
    const undoStagedMutations = createUndoStagedMutationsAction(mockContext, hooks.session.session, actor);

    const events = undoStagedMutations();

    // Should return no events
    expect(events).toHaveLength(0);

    // Should call declareError
    expect(declareErrorSpy).toHaveBeenCalledWith('No staged mutations to undo');

    // Session should remain unchanged
    expect(hooks.session.session.data.pendingMutations).toHaveLength(0);
  });

  it('should use custom trace when provided', () => {
    // Create a workbench scenario with pending mutations
    const scenario = useSimpleWorkbenchScenario(mockContext, {
      name: 'Test Actor',
      pendingMutations: [
        createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 5),
      ],
    });

    const actorId = Object.keys(scenario.actors)[0] as ActorURN;
    const { actor, hooks } = scenario.actors[actorId];

    // Create the undo action
    const undoStagedMutations = createUndoStagedMutationsAction(mockContext, hooks.session.session, actor);

    const customTrace = 'custom-trace-789';
    const events = undoStagedMutations(customTrace);

    // Should use the custom trace
    expect(events[0].trace).toBe(customTrace);
  });
});
