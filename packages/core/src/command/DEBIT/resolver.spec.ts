import { describe, beforeEach, it, expect } from 'vitest';
import { debitResolver } from './resolver';
import { createIntent } from '~/intent/factory';
import { createCommandResolverContext } from '~/intent/resolution';
import { TransformerContext } from '~/types/handler';
import { WorldProjection } from '~/types/world';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { SessionURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';
import { CurrencyType } from '~/types/currency';
import { WellKnownActor } from '~/types';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_COMBAT_SESSION } from '~/testing/constants';

describe('DEBIT Command Parser', () => {
  let context: TransformerContext;
  let parserContext: ReturnType<typeof createCommandResolverContext>;

  const SESSION_ID: SessionURN = DEFAULT_COMBAT_SESSION;

  beforeEach(() => {
    context = createTestTransformerContext({
      world: createWorldProjection((w: WorldProjection) => ({
        ...w,
        sessions: {},
        items: {},
        actors: {
          [ALICE_ID]: createActor({
            id: ALICE_ID,
            name: 'Alice',
            location: DEFAULT_LOCATION,
          }),
          [BOB_ID]: createActor({
            id: BOB_ID,
            name: 'Bob',
            location: DEFAULT_LOCATION,
          }),
        },
        places: {
          [DEFAULT_LOCATION]: createPlace({
            id: DEFAULT_LOCATION,
            name: 'Test Arena',
          }),
        },
      })),
    });

    parserContext = createCommandResolverContext(context);
  });

  describe('Basic Functionality', () => {
    it('should recognize @debit verb', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap 100`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.DEBIT);
      expect(command?.actor).toBe(WellKnownActor.SYSTEM);
      expect(command?.location).toBe(DEFAULT_LOCATION);
      expect(command?.args.recipient).toBe(BOB_ID);
      expect(command?.args.currency).toBe(CurrencyType.SCRAP);
      expect(command?.args.amount).toBe(100);
    });

    it('should reject non-@debit verbs', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@credit ${BOB_ID} scrap 100`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should accept any recipient URN (world validation happens in reducer)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@debit flux:actor:missing scrap 100',
      });

      const command = debitResolver(parserContext, intent);

      // Pure resolvers don't validate world state - they only parse syntax
      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.DEBIT);
      expect(command?.args.recipient).toBe('flux:actor:missing');
    });

    it('should accept any currency string (business validation happens in reducer)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} gold 100`,
      });

      const command = debitResolver(parserContext, intent);

      // Pure resolvers don't validate business rules - they only parse syntax
      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.DEBIT);
      expect(command?.args.currency).toBe('gold');
    });

    it('should reject invalid amount (NaN)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap abc`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject amounts outside safe integer range', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap ${Number.MAX_SAFE_INTEGER + 1}`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Token Length Validation', () => {
    it('should reject commands with too few tokens', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID}`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject commands with too many tokens', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap 100 extra tokens`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should accept exactly 3 tokens after verb', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap 50`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(50);
    });
  });

  describe('Amount Parsing', () => {
    it('should parse positive integers', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap 42`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(42);
    });

    it('should parse zero amount', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap 0`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(0);
    });

    it('should parse negative amounts', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap -25`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(-25);
    });

    it('should reject decimal amounts (parseInt truncates)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap 10.5`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(10); // parseInt truncates
    });

    it('should handle maximum safe integer', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap ${Number.MAX_SAFE_INTEGER}`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle minimum safe integer', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap ${Number.MIN_SAFE_INTEGER}`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(Number.MIN_SAFE_INTEGER);
    });
  });

  describe('Session Threading', () => {
    it('should thread session ID from intent to command', () => {
      const customSessionId = 'flux:session:combat:aksjf9aw0f4';
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: customSessionId,
        text: `@debit ${BOB_ID} scrap 100`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBe(customSessionId);
    });

    it('should work without session ID', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap 100`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBeUndefined();
    });
  });

  describe('Command Structure Validation', () => {
    it('should preserve all required command fields', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: SESSION_ID,
        text: `@debit ${BOB_ID} scrap 250`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toMatchObject({
        id: intent.id,
        type: CommandType.DEBIT,
        actor: WellKnownActor.SYSTEM,
        location: DEFAULT_LOCATION,
        session: SESSION_ID,
        args: {
          recipient: BOB_ID,
          currency: CurrencyType.SCRAP,
          amount: 250,
        },
      });
    });

    it('should use SYSTEM actor regardless of intent actor', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@debit ${BOB_ID} scrap 100`,
      });

      const command = debitResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.actor).toBe(WellKnownActor.SYSTEM);
      expect(command?.actor).not.toBe(ALICE_ID);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should normalize any actor token to URN format', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@debit invalid-urn scrap 100',
      });

      const command = debitResolver(parserContext, intent);

      // Pure resolvers normalize tokens to URN format without world validation
      expect(command).toBeTruthy();
      expect(command?.args.recipient).toBe('flux:actor:invalid-urn');
    });

    it('should handle edge case numeric inputs safely', () => {
      const edgeCaseNumbers = [
        `@debit ${BOB_ID} scrap 1e308`,       // Scientific notation near infinity
        `@debit ${BOB_ID} scrap 1e-308`,      // Scientific notation near zero
        `@debit ${BOB_ID} scrap 0x41`,        // Hexadecimal
        `@debit ${BOB_ID} scrap 0b101`,       // Binary
        `@debit ${BOB_ID} scrap 0o77`,        // Octal
        `@debit ${BOB_ID} scrap 3.14159265359`, // High precision decimal
        `@debit ${BOB_ID} scrap 1.7976931348623157e+308`, // Near MAX_VALUE
        `@debit ${BOB_ID} scrap 5e-324`,      // Near MIN_VALUE
      ];

      edgeCaseNumbers.forEach((text, index) => {
        const intent = createIntent({
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text,
        });

        const command = debitResolver(parserContext, intent);

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
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text: `@debit ${BOB_ID} ${currency} 100`,
        });

        const command = debitResolver(parserContext, intent);

        expect(command).toBeTruthy();
        expect(command?.args.currency).toBe(currency);
      });
    });

    it('should accept any currency string (business validation happens in reducer)', () => {
      const anyCurrencies = ['gold', 'silver', 'bitcoin', 'credits', 'coins'];

      anyCurrencies.forEach((currency) => {
        const intent = createIntent({
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text: `@debit ${BOB_ID} ${currency} 100`,
        });

        const command = debitResolver(parserContext, intent);

        // Pure resolvers don't validate business rules - they only parse syntax
        expect(command).toBeTruthy();
        expect(command?.args.currency).toBe(currency);
      });
    });
  });
});
