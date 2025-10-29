import { describe, it, expect, beforeEach } from 'vitest';
import { addShellAttributeResolver } from './resolver';
import { CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createTransformerContext } from '~/worldkit/context';
import { createCommandResolverContext } from '~/intent/resolution';
import { ALICE_ID } from '~/testing/constants';
import { ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { MAX_STAT_VALUE } from '~/worldkit/entity/actor/stats';
import { TransformerContext } from '~/types/handler';
import { createWorldScenario } from '~/worldkit/scenario';
import { createActor } from '~/worldkit/entity/actor';

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

describe('WORKBENCH_SHELL_ATTRIBUTE_ADD resolver', () => {

  let context: TransformerContext;
  let resolverContext: CommandResolverContext;

  beforeEach(() => {
    context = createTransformerContext();

    createWorldScenario(context, {
      actors: [createActor({ id: ALICE_ID, name: 'Alice' })],
    });
    resolverContext = createCommandResolverContext(context);
  });

  describe('Valid Syntax', () => {
    it.each([
      ['shell attribute add pow 10', 'pow', 10],
      ['shell attr add fin 5', 'fin', 5],
      ['shell attribute add res 100', 'res', 100],
    ])('should resolve "%s" command', (text, expectedStat, expectedAmount) => {
      const intent = createTestIntent(text);
      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.type).toBe(CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD);
      expect(command?.actor).toBe(ALICE_ID);
      expect(command?.args).toEqual({
        type: ShellMutationType.STAT,
        operation: StatMutationOperation.ADD,
        stat: expectedStat,
        amount: expectedAmount,
      });
    });

    it('should reject large numeric values exceeding security limit', () => {
      const intent = createTestIntent('shell attribute add pow 9999');
      const command = addShellAttributeResolver(resolverContext, intent);
      expect(command).toBeUndefined();
    });

    it('should handle zero values', () => {
      const intent = createTestIntent('shell attribute add fin 0');

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.args.amount).toBe(0);
    });
  });

  describe('Invalid Syntax - Wrong Prefix', () => {
    it.each([
      'weapon attribute add pow 10',
      'item attribute add fin 5',
      'character attribute add res 100',
    ])('should reject "%s" (wrong prefix)', (text) => {
      const intent = createTestIntent(text);

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Invalid Syntax - Wrong Token Count', () => {
    it.each([
      'shell',
      'shell attribute',
      'shell attribute add',
      'shell attribute add pow',
      'shell attribute add pow 10 extra',
    ])('should reject "%s" (wrong token count)', (text) => {
      const intent = createTestIntent(text);

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Invalid Syntax - Wrong Attribute Token', () => {
    it.each([
      'shell stats add pow 10',
      'shell property add fin 5',
      'shell value add res 100',
    ])('should reject "%s" (wrong attribute token)', (text) => {
      const intent = createTestIntent(text);

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Invalid Syntax - Wrong Verb', () => {
    it.each([
      'shell attribute remove pow 10',
      'shell attribute set fin 5',
      'shell attribute modify res 100',
    ])('should reject "%s" (wrong verb)', (text) => {
      const intent = createTestIntent(text);

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Invalid Syntax - Wrong Stat', () => {
    it.each([
      'shell attribute add str 10',
      'shell attribute add dex 5',
      'shell attribute add invalid 100',
    ])('should reject "%s" (invalid stat)', (text) => {
      const intent = createTestIntent(text);

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Invalid Syntax - Invalid Numeric Values', () => {
    it.each([
      'shell attribute add pow abc',
      'shell attribute add fin 10.5',
      'shell attribute add res -5',
      'shell attribute add pow 1a2',
    ])('should reject "%s" (invalid numeric value)', (text) => {
      const intent = createTestIntent(text);

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Security and Edge Cases', () => {
    it('should reject amounts exceeding MAX_STAT_VALUE (100)', () => {
      const intent = createTestIntent('shell attribute add pow 101');

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeUndefined();
    });

    it('should handle edge case numeric inputs safely', () => {
      const edgeCaseNumbers = [
        'shell attribute add pow 1e308',       // Scientific notation near infinity
        'shell attribute add fin 1e-308',      // Scientific notation near zero
        'shell attribute add res 0x41',        // Hexadecimal
        'shell attribute add pow 0b101',       // Binary
        'shell attribute add fin 0o77',        // Octal
        'shell attribute add res 3.14159',     // High precision decimal
        'shell attribute add pow 1.7976931348623157e+308', // Near MAX_VALUE
        'shell attribute add fin 5e-324',      // Near MIN_VALUE
      ];

      edgeCaseNumbers.forEach((text) => {
        const intent = createTestIntent(text);

        const command = addShellAttributeResolver(resolverContext, intent);

        if (command) {
          // Should either be a valid finite number or be rejected
          expect(Number.isFinite(command.args.amount)).toBe(true);
          expect(command.args.amount).toBeGreaterThanOrEqual(0);
          expect(command.args.amount).toBeLessThanOrEqual(MAX_STAT_VALUE);
        }
      });
    });

    it('should reject negative amounts', () => {
      const intent = createTestIntent('shell attribute add pow -5');

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeUndefined();
    });

    it('should handle maximum safe integer boundary', () => {
      const intent = createTestIntent(`shell attribute add pow ${Number.MAX_SAFE_INTEGER}`);

      const command = addShellAttributeResolver(resolverContext, intent);

      // Should be rejected due to exceeding MAX_STAT_VALUE
      expect(command).toBeUndefined();
    });

    it('should handle minimum safe integer boundary', () => {
      const intent = createTestIntent(`shell attribute add pow ${Number.MIN_SAFE_INTEGER}`);

      const command = addShellAttributeResolver(resolverContext, intent);

      // Should be rejected due to being negative
      expect(command).toBeUndefined();
    });

    it('should handle maximum allowed modification amount (MAX_STAT_VALUE)', () => {
      const intent = createTestIntent(`shell attribute add pow ${MAX_STAT_VALUE}`);

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command?.args.amount).toBe(MAX_STAT_VALUE);
    });
  });

  describe('Command Structure Validation', () => {
    it('should return correct command structure', () => {
      const intent = createTestIntent('shell attribute add pow 25');

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command).toBeDefined();
      expect(command).toMatchObject({
        id: 'test-intent-id',
        type: CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD,
        actor: ALICE_ID,
        location: 'flux:place:test-workbench',
        args: {
          type: ShellMutationType.STAT,
          operation: StatMutationOperation.ADD,
          stat: 'pow',
          amount: 25,
        },
      });
    });

    it('should preserve intent metadata in command', () => {
      const customTimestamp = Date.now() - 1000;
      const intent = createTestIntent('shell attribute add fin 15', customTimestamp);

      const command = addShellAttributeResolver(resolverContext, intent);

      expect(command?.id).toBe(intent.id);
      expect(command?.actor).toBe(intent.actor);
      expect(command?.location).toBe(intent.location);
    });
  });
});
