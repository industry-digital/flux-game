import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiffStagedMutationsAction } from './diff';
import { ActorStat } from '~/types/entity/actor';
import { StatMutationOperation } from '~/types/workbench';
import { EventType } from '~/types/event';
import {
  useSimpleWorkbenchScenario,
  createStatMutation,
  createMockWorkbenchContext
} from '../testing';

describe('diffStagedMutations', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = createMockWorkbenchContext();
  });

  it('should create diff for staged mutations and return success event', () => {
    // Create a workbench scenario with an actor and shell
    const scenario = useSimpleWorkbenchScenario(mockContext, {
      name: 'Test Actor',
      stats: { pow: 15, fin: 12 },
      shellStats: { pow: 10, fin: 10 },
      pendingMutations: [
        createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 5),
        createStatMutation(ActorStat.FIN, StatMutationOperation.REMOVE, 2),
      ],
    });

    const actorId = Object.keys(scenario.actors)[0];
    const { actor, shell, hooks } = scenario.actors[actorId];

    // Create the diff action
    const diffStagedMutations = createDiffStagedMutationsAction(
      mockContext,
      hooks.session.session,
      actor,
      shell,
    );

    const events = diffStagedMutations();

    // Should return one event
    expect(events).toHaveLength(1);

    // Should be the correct event type
    expect(events[0].type).toBe(EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED);

    // Should have correct metadata
    expect(events[0].actor).toBe(actor.id);
    expect(events[0].location).toBe(actor.location);

    // Should have a narrative
    expect(events[0].narrative).toBeDefined();
    expect(events[0].narrative.self).toBeDefined();
    expect(typeof events[0].narrative.self).toBe('string');

    // Should have a shell diff payload
    expect(events[0].payload).toBeDefined();
    expect(events[0].payload.shellId).toBe(shell.id);
    expect(events[0].payload.cost).toBeDefined();
    expect(events[0].payload.stats).toBeDefined();
    expect(events[0].payload.perf).toBeDefined();

    // Should show stat changes in the payload
    expect(events[0].payload.stats).toEqual({
      pow: '10 -> 15',
      fin: '10 -> 8',
    });
  });

  it('should reject diff when no mutations are staged', () => {
    const declareErrorSpy = vi.fn();
    mockContext.declareError = declareErrorSpy;

    // Create a workbench scenario with no pending mutations
    const scenario = useSimpleWorkbenchScenario(mockContext, {
      name: 'Test Actor',
      pendingMutations: [], // No mutations
    });

    const actorId = Object.keys(scenario.actors)[0];
    const { actor, shell, hooks } = scenario.actors[actorId];

    // Create the diff action
    const diffStagedMutations = createDiffStagedMutationsAction(
      mockContext,
      hooks.session.session,
      actor,
      shell,
    );

    const events = diffStagedMutations();

    // Should return no events
    expect(events).toHaveLength(0);

    // Should call declareError
    expect(declareErrorSpy).toHaveBeenCalledWith('No staged mutations to diff');
  });

  it('should use custom trace when provided', () => {
    // Create a workbench scenario with pending mutations
    const scenario = useSimpleWorkbenchScenario(mockContext, {
      name: 'Test Actor',
      pendingMutations: [
        createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 3),
      ],
    });

    const actorId = Object.keys(scenario.actors)[0];
    const { actor, shell, hooks } = scenario.actors[actorId];

    // Create the diff action
    const diffStagedMutations = createDiffStagedMutationsAction(
      mockContext,
      hooks.session.session,
      actor,
      shell,
    );

    const customTrace = 'custom-diff-trace-123';
    const events = diffStagedMutations(customTrace);

    // Should use the custom trace
    expect(events[0].trace).toBe(customTrace);
  });

  it('should include performance changes in the diff', () => {
    // Create a workbench scenario with mutations that affect performance
    const scenario = useSimpleWorkbenchScenario(mockContext, {
      name: 'Test Actor',
      stats: { pow: 20 }, // High power for performance impact
      shellStats: { pow: 15 },
      pendingMutations: [
        createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 10), // Big change
      ],
    });

    const actorId = Object.keys(scenario.actors)[0];
    const { actor, shell, hooks } = scenario.actors[actorId];

    // Create the diff action
    const diffStagedMutations = createDiffStagedMutationsAction(
      mockContext,
      hooks.session.session,
      actor,
      shell,
    );

    const events = diffStagedMutations();

    // Should have performance changes
    expect(events[0].payload.perf).toBeDefined();

    // Performance changes should be strings (either "X -> Y" or "X")
    const perfChanges = events[0].payload.perf;
    expect(typeof perfChanges.totalMassKg).toBe('string');
    expect(typeof perfChanges.weaponDps).toBe('string');
    expect(typeof perfChanges.freePower).toBe('string');

    // Should include narrative that mentions the changes
    expect(events[0].narrative.self).toBeDefined();
    expect(events[0].narrative.self.length).toBeGreaterThan(0);
  });
});
