import { describe, it, expect } from 'vitest';
import { listShellsResolver } from './resolver';
import { CommandType, Intent } from '~/types/intent';
import { createTransformerContext } from '~/worldkit/context';
import { createCommandResolverContext } from '~/intent/resolution';
import { useWorkbenchScenario } from '~/worldkit/workbench/testing';
import { ALICE_ID } from '~/testing/constants';

/**
 * Simple helper to create Intent objects for testing
 */
const createTestIntent = (text: string, now = Date.now()): Intent => ({
  id: 'test-intent-id',
  ts: now,
  actor: ALICE_ID,
  location: 'flux:place:test-workbench',
  text,
  normalized: text.toLowerCase().trim(),
  prefix: text.split(' ')[0].toLowerCase(),
  tokens: text.toLowerCase().trim().split(' ').slice(1),
  uniques: new Set(text.toLowerCase().trim().split(' ').slice(1)),
  options: undefined,
});

describe('WORKBENCH_SHELL_LIST resolver', () => {
  it('should resolve "shell list" command', () => {
    const context = createTransformerContext();
    const scenario = useWorkbenchScenario(context, {
      participants: {
        [ALICE_ID]: { name: 'Alice' }
      }
    });

    const resolverContext = createCommandResolverContext();
    const intent = createTestIntent('shell list');

    const command = listShellsResolver(resolverContext, intent);

    expect(command).toBeDefined();
    expect(command?.type).toBe(CommandType.WORKBENCH_SHELL_LIST);
    expect(command?.actor).toBe(ALICE_ID);
    expect(command?.args).toEqual({});
  });

  it('should resolve "shell ls" command', () => {
    const context = createTransformerContext();
    const scenario = useWorkbenchScenario(context, {
      participants: {
        [ALICE_ID]: { name: 'Alice' }
      }
    });

    const resolverContext = createCommandResolverContext();
    const intent = createTestIntent('shell ls');

    const command = listShellsResolver(resolverContext, intent);

    expect(command).toBeDefined();
    expect(command?.type).toBe(CommandType.WORKBENCH_SHELL_LIST);
  });

  it('should reject wrong verb', () => {
    const context = createTransformerContext();
    const scenario = useWorkbenchScenario(context, {
      participants: {
        [ALICE_ID]: { name: 'Alice' }
      }
    });

    const resolverContext = createCommandResolverContext();
    const intent = createTestIntent('weapon list');

    const command = listShellsResolver(resolverContext, intent);

    expect(command).toBeUndefined();
  });

  it('should reject wrong action', () => {
    const context = createTransformerContext();
    const scenario = useWorkbenchScenario(context, {
      participants: {
        [ALICE_ID]: { name: 'Alice' }
      }
    });

    const resolverContext = createCommandResolverContext();
    const intent = createTestIntent('shell create');

    const command = listShellsResolver(resolverContext, intent);

    expect(command).toBeUndefined();
  });

  it('should reject too many tokens', () => {
    const context = createTransformerContext();
    const scenario = useWorkbenchScenario(context, {
      participants: {
        [ALICE_ID]: { name: 'Alice' }
      }
    });

    const resolverContext = createCommandResolverContext();
    const intent = createTestIntent('shell list all shells');

    const command = listShellsResolver(resolverContext, intent);

    expect(command).toBeUndefined();
  });

  it('should reject no action', () => {
    const context = createTransformerContext();
    const scenario = useWorkbenchScenario(context, {
      participants: {
        [ALICE_ID]: { name: 'Alice' }
      }
    });

    const resolverContext = createCommandResolverContext();
    const intent = createTestIntent('shell');

    const command = listShellsResolver(resolverContext, intent);

    expect(command).toBeUndefined();
  });
});
