import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { creditReducer } from './reducer';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { createWorldScenario } from '~/worldkit/scenario';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createPlace } from '~/worldkit/entity/place';
import { CurrencyType, TransactionType } from '~/types/currency';
import { getBalance, setBalance } from '~/worldkit/entity/actor/wallet';
import { EventType, ActorDidCompleteCurrencyTransaction } from '~/types/event';
import { createCreditCommand } from '~/testing/command/factory/currency';
import { ALICE_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { Actor } from '~/types/entity/actor';
import { createDefaultActors } from '~/testing/actors';

describe('CREDIT Command Reducer', () => {
  let alice: Actor;
  let context: TransformerContext;

  // Test entities
  const RECIPIENT_ID: ActorURN = ALICE_ID;

  beforeEach(() => {
    const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice } = createDefaultActors(DEFAULT_LOCATION));

    context = createTransformerContext((c) => ({
      ...c,
      declareEvent: vi.fn(),
      declareError: vi.fn(),
    }));

    createWorldScenario(context, {
      places: [place],
      actors: [alice],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Specialized command factory for this test suite
  const createMockCreditCommand = (transform?: (cmd: ReturnType<typeof createCreditCommand>) => ReturnType<typeof createCreditCommand>) => {
    const baseCommand = createCreditCommand((cmd) => ({
      ...cmd,
      location: DEFAULT_LOCATION,
      args: {
        ...cmd.args,
        recipient: RECIPIENT_ID,
      },
    }));

    return transform ? transform(baseCommand) : baseCommand;
  };

  describe('Basic Functionality', () => {
    it('should credit funds to recipient actor', () => {
      setBalance(alice, CurrencyType.SCRAP, 50);
      const command = createMockCreditCommand();
      creditReducer(context, command);
      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(150);
    });

    it('should credit funds to actor with zero balance', () => {
      setBalance(alice, CurrencyType.SCRAP, 0);
      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(0);

      const command = createCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: alice.id,
          currency: CurrencyType.SCRAP,
          amount: 75,
        },
      }));

      creditReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(75);
    });

    it('should handle large credit amounts', () => {
      setBalance(alice, CurrencyType.SCRAP, 1000);

      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: Number.MAX_SAFE_INTEGER - 1000,
        },
      }));

      creditReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero credit amount', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      const initialBalance = 100;
      setBalance(recipient, CurrencyType.SCRAP, initialBalance);

      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 0,
        },
      }));

      creditReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(initialBalance);
    });

    it('should handle negative credit amount (should still add absolute value)', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: -25,
        },
      }));

      creditReducer(context, command);

      // Transaction system should use absolute value, so -25 becomes +25
      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(75);
    });
  });

  describe('Event Declaration', () => {
    it('should declare currency transaction event', () => {
      setBalance(alice, CurrencyType.SCRAP, 50);

      const command = createMockCreditCommand();
      creditReducer(context, command);

      expect(context.declareEvent).toHaveBeenCalledTimes(1);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
      expect(declaredEvent.trace).toBe(command.id);
      expect(declaredEvent.actor).toBe(RECIPIENT_ID);
      expect(declaredEvent.location).toBe(DEFAULT_LOCATION);
      expect(declaredEvent.payload.transaction.actorId).toBe(RECIPIENT_ID);
      expect(declaredEvent.payload.transaction.currency).toBe(CurrencyType.SCRAP);
      expect(declaredEvent.payload.transaction.type).toBe(TransactionType.CREDIT);
      expect(declaredEvent.payload.transaction.amount).toBe(100);
      expect(declaredEvent.payload.transaction.trace).toBe(command.id);
    });

    it('should create transaction with unique ID and timestamp', () => {
      setBalance(alice, CurrencyType.SCRAP, 0);

      const command = createMockCreditCommand();
      creditReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      const transaction = declaredEvent.payload.transaction;

      expect(typeof transaction.id).toBe('string');
      expect(transaction.id.length).toBeGreaterThan(0);
      expect(typeof transaction.ts).toBe('number');
      expect(transaction.ts).toBeGreaterThan(0);
    });

    it('should use command ID as transaction trace', () => {
      const commandId = 'unique-command-id-123';

      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        id: commandId,
      }));

      creditReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.payload.transaction.trace).toBe(commandId);
      expect(declaredEvent.trace).toBe(commandId);
    });
  });

  describe('Error Handling', () => {
    it('should declare error when recipient not found', () => {
      const nonExistentRecipient: ActorURN = 'flux:actor:missing:person';
      const command = createCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: nonExistentRecipient,
          currency: CurrencyType.SCRAP,
          amount: 100,
        },
      }));

      const resultContext = creditReducer(context, command);

      expect(context.declareError).toHaveBeenCalledTimes(1);
      expect(context.declareError).toHaveBeenCalledWith(
        'CREDIT recipient not found in world projection',
        command.id
      );
      expect(context.declareEvent).not.toHaveBeenCalled();
      expect(resultContext).toBe(context);
    });
  });

  describe('Currency Type Support', () => {
    it('should handle all supported currency types', () => {
      setBalance(alice, CurrencyType.SCRAP, 25);

      Object.values(CurrencyType).forEach((currency) => {
        vi.clearAllMocks();
        setBalance(alice, currency, 25);

        const command = createMockCreditCommand((cmd) => ({
          ...cmd,
          args: {
            ...cmd.args,
            currency,
            amount: 50,
          },
        }));

        creditReducer(context, command);

        expect(getBalance(alice, currency)).toBe(75);
        expect(context.declareEvent).toHaveBeenCalledTimes(1);

        const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
        expect(declaredEvent.payload.transaction.currency).toBe(currency);
      });
    });
  });

  describe('Context Immutability', () => {
    it('should return the same context object', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const command = createMockCreditCommand();
      const resultContext = creditReducer(context, command);

      expect(resultContext).toBe(context);
    });

    it('should not create new context objects unnecessarily', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const originalWorld = context.world;
      const command = createMockCreditCommand();

      creditReducer(context, command);

      // World reference should remain the same (mutations are in-place)
      expect(context.world).toBe(originalWorld);
    });
  });

  describe('Integration with Transaction System', () => {
    it('should properly integrate with createCurrencyTransaction', () => {
      setBalance(alice, CurrencyType.SCRAP, 100);

      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 75,
        },
      }));

      creditReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      const transaction = declaredEvent.payload.transaction;

      // Verify transaction structure matches createCurrencyTransaction output
      expect(transaction).toMatchObject({
        actorId: alice.id,
        currency: CurrencyType.SCRAP,
        type: TransactionType.CREDIT,
        amount: 75, // Should be positive even if input was negative
        trace: command.id,
      });

      // Verify required fields are present
      expect(typeof transaction.id).toBe('string');
      expect(typeof transaction.ts).toBe('number');
    });

    it('should properly integrate with executeCurrencyTransaction', () => {
      const initialBalance = 200;
      setBalance(alice, CurrencyType.SCRAP, initialBalance);

      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 150,
        },
      }));

      creditReducer(context, command);

      // Verify wallet was updated correctly
      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(350);

      // Verify event was declared correctly
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum safe integer amounts', () => {
      setBalance(alice, CurrencyType.SCRAP, 0);

      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: Number.MAX_SAFE_INTEGER,
        },
      }));

      creditReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle minimum safe integer amounts (negative)', () => {
      setBalance(alice, CurrencyType.SCRAP, 0);

      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: Number.MIN_SAFE_INTEGER,
        },
      }));

      creditReducer(context, command);

      // Should credit the absolute value
      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(Math.abs(Number.MIN_SAFE_INTEGER));
    });

    it('should handle fractional amounts (should be handled by transaction system)', () => {
      setBalance(alice, CurrencyType.SCRAP, 100);

      // Note: This test assumes the parser would have already converted to integer,
      // but we test the reducer's robustness
      const command = createMockCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 50.75,
        },
      }));

      creditReducer(context, command);

      // Transaction system should handle the fractional amount appropriately
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(typeof declaredEvent.payload.transaction.amount).toBe('number');
    });
  });

  describe('Command Validation', () => {

    it('should work with different locations', () => {
      setBalance(alice, CurrencyType.SCRAP, 50);

      const differentPlace: PlaceURN = 'flux:place:test:different';
      context.world.places[differentPlace] = createPlace({
        id: differentPlace,
        name: 'Different Place',
      });

      // Move the actor to the different place
      alice.location = differentPlace;

      const command = createMockCreditCommand((c) => ({...c, location: differentPlace }));
      creditReducer(context, command);

      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      // Event location should be the actor's location, not the command's location
      expect(declaredEvent.location).toBe(differentPlace);
    });
  });
});
