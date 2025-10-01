import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStageMutationAction, validateStatMutation } from './stage';
import { ShellMutationType, StatMutation, StatMutationOperation, WorkbenchSession } from '~/types/workbench';
import { Actor } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { TransformerContext } from '~/types/handler';
import { EventType } from '~/types/event';

describe('stageMutation', () => {
  let mockContext: TransformerContext;
  let mockSession: WorkbenchSession;
  let mockActor: Actor;
  let mockShell: Shell;

  beforeEach(() => {
    mockContext = {
      uniqid: () => 'test-trace-123',
      declareError: () => {},
    } as any;

    mockSession = {
      id: 'session-123',
      data: {
        pendingMutations: [],
      },
    } as WorkbenchSession;

    mockActor = {
      id: 'actor-123',
      location: 'test-location',
    } as Actor;

    mockShell = {
      id: 'shell-123',
      stats: {
        might: { eff: 10 },
        finesse: { eff: 15 },
        intellect: { eff: 20 },
        resolve: { eff: 12 },
      },
    } as Shell;
  });

  it('should stage a valid stat mutation and return success event', () => {
    const stageMutation = createStageMutationAction(mockContext, mockSession, mockActor, mockShell);

    const mutation: StatMutation = {
      type: ShellMutationType.STAT,
      stat: 'might',
      operation: StatMutationOperation.ADD,
      amount: 5,
    };

    const events = stageMutation(mutation);

    // Should return one event
    expect(events).toHaveLength(1);

    // Should be the correct event type
    expect(events[0].type).toBe(EventType.WORKBENCH_SHELL_MUTATION_STAGED);

    // Should have correct payload
    expect(events[0].payload).toEqual({
      shellId: 'shell-123',
      mutation,
    });

    // Should have correct metadata
    expect(events[0].actor).toBe('actor-123');
    expect(events[0].location).toBe('test-location');
    expect(events[0].trace).toBe('test-trace-123');

    // Should add mutation to session
    expect(mockSession.data.pendingMutations).toHaveLength(1);
    expect(mockSession.data.pendingMutations[0]).toEqual(mutation);
  });

  it('should reject invalid stat mutation and return no events', () => {
    const declareErrorSpy = vi.fn();
    mockContext.declareError = declareErrorSpy;

    const stageMutation = createStageMutationAction(mockContext, mockSession, mockActor, mockShell);

    const mutation: StatMutation = {
      type: ShellMutationType.STAT,
      stat: 'might',
      operation: StatMutationOperation.SUBTRACT,
      amount: 20, // Would make might go to -10
    };

    const events = stageMutation(mutation);

    // Should return no events
    expect(events).toHaveLength(0);

    // Should call declareError
    expect(declareErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('cannot go below 0')
    );

    // Should not add mutation to session
    expect(mockSession.data.pendingMutations).toHaveLength(0);
  });
});

describe('validateStatMutation', () => {
  let mockShell: Shell;

  beforeEach(() => {
    mockShell = {
      stats: {
        might: { eff: 10 },
        finesse: { eff: 15 },
        intellect: { eff: 20 },
        resolve: { eff: 12 },
      },
    } as Shell;
  });

  it('should validate successful stat addition', () => {
    const mutation: StatMutation = {
      type: ShellMutationType.STAT,
      stat: 'might',
      operation: StatMutationOperation.ADD,
      amount: 5,
    };

    const result = validateStatMutation(mockShell, mutation);

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate successful stat subtraction', () => {
    const mutation: StatMutation = {
      type: ShellMutationType.STAT,
      stat: 'might',
      operation: StatMutationOperation.SUBTRACT,
      amount: 5,
    };

    const result = validateStatMutation(mockShell, mutation);

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject stat going below 0', () => {
    const mutation: StatMutation = {
      type: ShellMutationType.STAT,
      stat: 'might',
      operation: StatMutationOperation.SUBTRACT,
      amount: 15, // 10 - 15 = -5
    };

    const result = validateStatMutation(mockShell, mutation);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Stat might cannot go below 0 (attempted: -5)');
  });

  it('should reject stat going above 100', () => {
    const mutation: StatMutation = {
      type: ShellMutationType.STAT,
      stat: 'might',
      operation: StatMutationOperation.ADD,
      amount: 95, // 10 + 95 = 105
    };

    const result = validateStatMutation(mockShell, mutation);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Stat might cannot exceed 100 (attempted: 105)');
  });
});
