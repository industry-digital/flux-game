import { describe, it, expect, beforeEach } from 'vitest';
import { renameShellResolver } from './resolver';
import { createCommandResolverContext } from '~/intent/resolution';
import { createTestTransformerContext } from '~/testing/context-testing';
import { useWorkbenchScenario } from '~/worldkit/workbench/testing';
import { CommandType, Intent } from '~/types/intent';
import { ALICE_ID } from '~/testing/constants';

/**
 * Simple helper to create Intent objects for testing
 */
const createTestIntent = (text: string, now = Date.now()): Intent => {
  const normalized = text.toLowerCase().trim();
  const parts = text.trim().split(' '); // Use original case for tokens
  const normalizedParts = normalized.split(' ');
  return {
    id: `test-intent-${now}`,
    ts: now,
    actor: ALICE_ID,
    location: 'flux:place:test-workbench' as any,
    verb: normalizedParts[0],
    tokens: parts.slice(1), // Preserve original case
    uniques: new Set(normalizedParts.slice(1)),
    options: undefined,
    text,
    normalized,
  };
};

describe('WORKBENCH_SHELL_RENAME Resolver', () => {
  let context: ReturnType<typeof createTestTransformerContext>;
  let scenario: ReturnType<typeof useWorkbenchScenario>;

  beforeEach(() => {
    context = createTestTransformerContext();
    scenario = useWorkbenchScenario(context, {
      participants: {
        [ALICE_ID]: { name: 'Alice' }
      }
    });
  });

  describe('valid rename commands', () => {
    it('should resolve "shell rename <new-name>" (rename current shell)', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename NewShellName');
      const command = renameShellResolver(resolverContext, intent)!;

      expect(command).toBeDefined();
      expect(command.type).toBe(CommandType.WORKBENCH_SHELL_RENAME);
      expect(command.actor).toBe(ALICE_ID);
      expect(command.location).toBe('flux:place:test-workbench');
      expect(command.args).toEqual({
        newName: 'NewShellName',
        shellNameOrId: undefined,
      });
    });

    it('should resolve "shell rename <shell-id> <new-name>"', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename shell123 NewShellName');
      const command = renameShellResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.type).toBe(CommandType.WORKBENCH_SHELL_RENAME);
      expect(command?.actor).toBe(ALICE_ID);
      expect(command?.location).toBe('flux:place:test-workbench');
      expect(command?.args).toEqual({
        newName: 'NewShellName',
        shellNameOrId: 'shell123',
      });
    });

    it('should resolve "shell rename <shell-id> to <new-name>"', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename shell123 to NewShellName');
      const command = renameShellResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.type).toBe(CommandType.WORKBENCH_SHELL_RENAME);
      expect(command?.actor).toBe(ALICE_ID);
      expect(command?.location).toBe('flux:place:test-workbench');
      expect(command?.args).toEqual({
        newName: 'NewShellName',
        shellNameOrId: 'shell123',
      });
    });

    it('should handle "to" syntax correctly', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename OldShell to NewShell');
      const command = renameShellResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.args).toEqual({
        newName: 'NewShell',
        shellNameOrId: 'OldShell',
      });
    });

    it('should handle numeric shell IDs', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename 123 NewName');
      const command = renameShellResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.args).toEqual({
        newName: 'NewName',
        shellNameOrId: '123',
      });
    });
  });

  describe('invalid commands', () => {
    it('should reject commands with wrong verb', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('weapon rename NewName');
      const command = renameShellResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });

    it('should reject commands with wrong action', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell delete OldName');
      const command = renameShellResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });

    it('should reject commands with insufficient tokens', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename');
      const command = renameShellResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });

    it('should reject commands with only one token after "rename"', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell');
      const command = renameShellResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });

    it('should reject commands with too many tokens (5+ tokens)', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename old to new extra');
      const command = renameShellResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });

    it('should reject 4-token commands without "to" keyword', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename old shell new');
      const command = renameShellResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });

    it('should reject commands with invalid shell names (only special characters)', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename !@#$%');
      const command = renameShellResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });

    it('should reject commands with shell names that are too long', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const longName = 'a'.repeat(51);
      const intent = createTestIntent(`shell rename ${longName}`);
      const command = renameShellResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should reject empty new name in 2-token format', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename ""');
      const command = renameShellResolver(resolverContext, intent);

      // Should be rejected because sanitization removes quotes, leaving empty string
      expect(command).toBeUndefined();
    });

    it('should handle special characters in shell names', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename shell-123_test NewName');
      const command = renameShellResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.args).toEqual({
        newName: 'NewName',
        shellNameOrId: 'shell-123_test',
      });
    });

    it('should sanitize special characters in new names', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename old-shell new_name-123');
      const command = renameShellResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.args).toEqual({
        newName: 'newname123', // Sanitized: underscores and hyphens removed
        shellNameOrId: 'old-shell',
      });
    });
  });

  describe('command structure validation', () => {
    it('should preserve intent metadata in command', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const testTime = Date.now();
      const intent = createTestIntent('shell rename NewName', testTime);
      const command = renameShellResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.id).toBe(`test-intent-${testTime}`);
      expect(command?.actor).toBe(ALICE_ID);
      expect(command?.location).toBe('flux:place:test-workbench');
    });

    it('should include session information when present in intent', () => {
      const resolverContext = createCommandResolverContext(scenario.context);
      const intent = createTestIntent('shell rename NewName');
      intent.session = 'flux:session:workbench:test123' as any;
      const command = renameShellResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.session).toBe('flux:session:workbench:test123');
    });
  });
});
