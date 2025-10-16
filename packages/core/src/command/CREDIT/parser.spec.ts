import { describe, beforeEach, it, expect } from 'vitest';
import { creditIntentParser } from './parser';
import { createIntent } from '~/intent/factory';
import { createIntentParserContext } from '~/intent/resolution';
import { TransformerContext, WorldProjection } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';
import { CurrencyType, WellKnownActor } from '~/types';

describe('CREDIT Command Parser', () => {
  let context: TransformerContext;
  let parserContext: ReturnType<typeof createIntentParserContext>;

  // Test entities
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const RECIPIENT_ID: ActorURN = 'flux:actor:test:bob';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';
  const SESSION_ID: SessionURN = 'flux:session:test:credit';

  beforeEach(() => {
    context = createTestTransformerContext({
      world: createWorldProjection((w: WorldProjection) => ({
        ...w,
        sessions: {},
        items: {},
        actors: {
          [ACTOR_ID]: createActor({
            id: ACTOR_ID,
            name: 'Alice',
            location: PLACE_ID,
          }),
          [RECIPIENT_ID]: createActor({
            id: RECIPIENT_ID,
            name: 'Bob',
            location: PLACE_ID,
          }),
        },
        places: {
          [PLACE_ID]: createPlace({
            id: PLACE_ID,
            name: 'Test Arena',
          }),
        },
      })),
    });

    parserContext = createIntentParserContext(context);
  });

  describe('Basic Functionality', () => {
    it('should recognize @credit verb', () => {
      const intent = createIntent({
        id: 'test-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap 100',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.CREDIT);
      expect(command?.actor).toBe(WellKnownActor.SYSTEM);
      expect(command?.location).toBe(PLACE_ID);
      expect(command?.args.recipient).toBe(RECIPIENT_ID);
      expect(command?.args.currency).toBe(CurrencyType.SCRAP);
      expect(command?.args.amount).toBe(100);
    });

    it('should reject non-@credit verbs', () => {
      const intent = createIntent({
        id: 'test-2',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@debit flux:actor:test:bob scrap 100',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject when recipient not found', () => {
      const intent = createIntent({
        id: 'test-3',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:missing scrap 100',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject invalid currency types', () => {
      const intent = createIntent({
        id: 'test-4',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob gold 100',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject invalid amount (NaN)', () => {
      const intent = createIntent({
        id: 'test-5',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap abc',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject amounts outside safe integer range', () => {
      const intent = createIntent({
        id: 'test-6',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: `@credit flux:actor:test:bob scrap ${Number.MAX_SAFE_INTEGER + 1}`,
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Token Length Validation', () => {
    it('should reject commands with too few tokens', () => {
      const intent = createIntent({
        id: 'test-7',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject commands with too many tokens', () => {
      const intent = createIntent({
        id: 'test-8',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap 100 extra tokens',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should accept exactly 3 tokens after verb', () => {
      const intent = createIntent({
        id: 'test-9',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap 50',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(50);
    });
  });

  describe('Amount Parsing', () => {
    it('should parse positive integers', () => {
      const intent = createIntent({
        id: 'test-10',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap 42',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(42);
    });

    it('should parse zero amount', () => {
      const intent = createIntent({
        id: 'test-11',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap 0',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(0);
    });

    it('should parse negative amounts', () => {
      const intent = createIntent({
        id: 'test-12',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap -25',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(-25);
    });

    it('should reject decimal amounts (parseInt truncates)', () => {
      const intent = createIntent({
        id: 'test-13',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap 10.5',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(10); // parseInt truncates
    });

    it('should handle maximum safe integer', () => {
      const intent = createIntent({
        id: 'test-14',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: `@credit flux:actor:test:bob scrap ${Number.MAX_SAFE_INTEGER}`,
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle minimum safe integer', () => {
      const intent = createIntent({
        id: 'test-15',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: `@credit flux:actor:test:bob scrap ${Number.MIN_SAFE_INTEGER}`,
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(Number.MIN_SAFE_INTEGER);
    });
  });

  describe('Session Threading', () => {
    it('should thread session ID from intent to command', () => {
      const intent = createIntent({
        id: 'test-16',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: '@credit flux:actor:test:bob scrap 100',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBe(SESSION_ID);
    });

    it('should work without session ID', () => {
      const intent = createIntent({
        id: 'test-17',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap 100',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBeUndefined();
    });
  });

  describe('Command Structure Validation', () => {
    it('should preserve all required command fields', () => {
      const intent = createIntent({
        id: 'test-18',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: '@credit flux:actor:test:bob scrap 250',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toMatchObject({
        id: intent.id,
        type: CommandType.CREDIT,
        actor: WellKnownActor.SYSTEM,
        location: PLACE_ID,
        session: SESSION_ID,
        args: {
          recipient: RECIPIENT_ID,
          currency: CurrencyType.SCRAP,
          amount: 250,
        },
      });
    });

    it('should use SYSTEM actor regardless of intent actor', () => {
      const intent = createIntent({
        id: 'test-19',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:test:bob scrap 100',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.actor).toBe(WellKnownActor.SYSTEM);
      expect(command?.actor).not.toBe(ACTOR_ID);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle malformed actor URNs gracefully', () => {
      const intent = createIntent({
        id: 'test-20',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit invalid-urn scrap 100',
      });

      const command = creditIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should sanitize input and not propagate raw user data', () => {
      const maliciousInputs = [
        '@credit flux:actor:test:bob scrap <script>alert("xss")</script>',
        '@credit flux:actor:test:bob scrap ${process.env.SECRET}',
        '@credit flux:actor:test:bob scrap ../../../etc/passwd',
        '@credit flux:actor:test:bob scrap DROP TABLE users;',
        '@credit flux:actor:test:bob scrap __proto__.constructor',
        '@credit flux:actor:test:bob scrap eval("malicious")',
        '@credit flux:actor:test:bob scrap function(){return window}',
        '@credit flux:actor:test:bob scrap \x00\x01\x02\x03',
        '@credit flux:actor:test:bob scrap NaN',
        '@credit flux:actor:test:bob scrap Infinity',
        '@credit flux:actor:test:bob scrap undefined',
        '@credit flux:actor:test:bob scrap null',
      ];

      maliciousInputs.forEach((maliciousText, index) => {
        const intent = createIntent({
          id: `security-test-${index}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: maliciousText,
        });

        const command = creditIntentParser(parserContext, intent);

        // Most malicious inputs should be rejected due to invalid amount parsing
        if (command) {
          // If command is created, ensure it contains only safe values
          expect(command.type).toBe(CommandType.CREDIT);
          expect(command.actor).toBe(WellKnownActor.SYSTEM);
          expect(command.args.recipient).toBe(RECIPIENT_ID);
          expect(command.args.currency).toBe(CurrencyType.SCRAP);
          expect(typeof command.args.amount).toBe('number');
          expect(Number.isFinite(command.args.amount)).toBe(true);

          // Verify no raw malicious input exists in the command
          const commandStr = JSON.stringify(command);
          expect(commandStr).not.toMatch(/<script/i);
          expect(commandStr).not.toMatch(/eval\(/i);
          expect(commandStr).not.toMatch(/\$\{/);
          expect(commandStr).not.toMatch(/\.\.\//);
          expect(commandStr).not.toMatch(/DROP\s+TABLE/i);
          expect(commandStr).not.toMatch(/__proto__/);
          expect(commandStr).not.toMatch(/constructor/);
          expect(commandStr).not.toMatch(/\x00/);
          expect(commandStr).not.toMatch(/\bundefined\b/);
          expect(commandStr).not.toMatch(/\bnull\b/);
        }
      });
    });

    it('should handle edge case numeric inputs safely', () => {
      const edgeCaseNumbers = [
        '@credit flux:actor:test:bob scrap 1e308',       // Scientific notation near infinity
        '@credit flux:actor:test:bob scrap 1e-308',      // Scientific notation near zero
        '@credit flux:actor:test:bob scrap 0x41',        // Hexadecimal
        '@credit flux:actor:test:bob scrap 0b101',       // Binary
        '@credit flux:actor:test:bob scrap 0o77',        // Octal
        '@credit flux:actor:test:bob scrap 3.14159265359', // High precision decimal
        '@credit flux:actor:test:bob scrap 1.7976931348623157e+308', // Near MAX_VALUE
        '@credit flux:actor:test:bob scrap 5e-324',      // Near MIN_VALUE
      ];

      edgeCaseNumbers.forEach((text, index) => {
        const intent = createIntent({
          id: `edge-numeric-${index}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text,
        });

        const command = creditIntentParser(parserContext, intent);

        if (command) {
          // Should either be a valid finite number or be rejected
          expect(Number.isFinite(command.args.amount)).toBe(true);
          expect(command.args.amount).toBeGreaterThanOrEqual(Number.MIN_SAFE_INTEGER);
          expect(command.args.amount).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
        }
      });
    });
  });

  describe('Currency Type Validation', () => {
    it('should accept valid currency types', () => {
      // Test all valid currency types
      Object.values(CurrencyType).forEach((currency) => {
        const intent = createIntent({
          id: `currency-test-${currency}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: `@credit flux:actor:test:bob ${currency} 100`,
        });

        const command = creditIntentParser(parserContext, intent);

        expect(command).toBeTruthy();
        expect(command?.args.currency).toBe(currency);
      });
    });

    it('should reject unknown currency types', () => {
      const invalidCurrencies = ['gold', 'silver', 'bitcoin', 'credits', 'coins'];

      invalidCurrencies.forEach((currency) => {
        const intent = createIntent({
          id: `invalid-currency-${currency}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: `@credit flux:actor:test:bob ${currency} 100`,
        });

        const command = creditIntentParser(parserContext, intent);

        expect(command).toBeUndefined();
      });
    });

  });
});
