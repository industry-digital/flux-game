import { describe, beforeEach, it, expect } from 'vitest';
import { creditResolver } from './resolver';
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
import { CurrencyType, WellKnownActor } from '~/types';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_COMBAT_SESSION } from '~/testing/constants';

describe('CREDIT Command Parser', () => {
  let context: TransformerContext;
  let parserContext: ReturnType<typeof createCommandResolverContext>;

  // Test entities
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

    parserContext = createCommandResolverContext();
  });

  describe('Basic Functionality', () => {
    it('should recognize @credit verb', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap 100',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.CREDIT);
      expect(command?.actor).toBe(WellKnownActor.SYSTEM);
      expect(command?.location).toBe(DEFAULT_LOCATION);
      expect(command?.args.recipient).toBe(BOB_ID);
      expect(command?.args.currency).toBe(CurrencyType.SCRAP);
      expect(command?.args.amount).toBe(100);
    });

    it('should reject non-@credit verbs', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@debit flux:actor:bob scrap 100',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should accept any recipient URN (world validation happens in reducer)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:missing scrap 100',
      });

      const command = creditResolver(parserContext, intent);

      // Pure resolvers don't validate world state - they only parse syntax
      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.CREDIT);
      expect(command?.args.recipient).toBe('flux:actor:missing');
    });

    it('should accept any currency string (business validation happens in reducer)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob gold 100',
      });

      const command = creditResolver(parserContext, intent);

      // Pure resolvers don't validate business rules - they only parse syntax
      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.CREDIT);
      expect(command?.args.currency).toBe('gold');
    });

    it('should reject invalid amount (NaN)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap abc',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject amounts outside safe integer range', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@credit flux:actor:bob scrap ${Number.MAX_SAFE_INTEGER + 1}`,
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('Token Length Validation', () => {
    it('should reject commands with too few tokens', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject commands with too many tokens', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap 100 extra tokens',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should accept exactly 3 tokens after verb', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap 50',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(50);
    });
  });

  describe('Amount Parsing', () => {
    it('should parse positive integers', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap 42',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(42);
    });

    it('should parse zero amount', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap 0',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(0);
    });

    it('should parse negative amounts', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap -25',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(-25);
    });

    it('should reject decimal amounts (parseInt truncates)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap 10.5',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(10); // parseInt truncates
    });

    it('should handle maximum safe integer', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@credit flux:actor:bob scrap ${Number.MAX_SAFE_INTEGER}`,
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle minimum safe integer', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: `@credit flux:actor:bob scrap ${Number.MIN_SAFE_INTEGER}`,
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.amount).toBe(Number.MIN_SAFE_INTEGER);
    });
  });

  describe('Session Threading', () => {
    it('should thread session ID from intent to command', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: SESSION_ID,
        text: '@credit flux:actor:bob scrap 100',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBe(SESSION_ID);
    });

    it('should work without session ID', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: '@credit flux:actor:bob scrap 100',
      });

      const command = creditResolver(parserContext, intent);

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
        text: '@credit flux:actor:bob scrap 250',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toMatchObject({
        id: intent.id,
        type: CommandType.CREDIT,
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
        text: '@credit flux:actor:bob scrap 100',
      });

      const command = creditResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.actor).toBe(WellKnownActor.SYSTEM);
      expect(command?.actor).not.toBe(ALICE_ID);
    });
  });

  describe('Currency Type Validation', () => {
    it('should accept valid currency types', () => {
      // Test all valid currency types
      Object.values(CurrencyType).forEach((currency) => {
        const intent = createIntent({
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text: `@credit flux:actor:bob ${currency} 100`,
        });

        const command = creditResolver(parserContext, intent);

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
          text: `@credit flux:actor:bob ${currency} 100`,
        });

        const command = creditResolver(parserContext, intent);

        // Pure resolvers don't validate business rules - they only parse syntax
        expect(command).toBeTruthy();
        expect(command?.args.currency).toBe(currency);
      });
    });

  });
});
