import { describe, beforeEach, it, expect, vi } from 'vitest';
import { debitReducer } from './reducer';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createPlace } from '~/worldkit/entity/place';
import { CurrencyType, TransactionType } from '~/types/currency';
import { getBalance, setBalance } from '~/worldkit/entity/actor/wallet';
import { EventType, ActorDidCompleteCurrencyTransaction } from '~/types/event';
import { createDebitCommand } from '~/testing/command/factory/currency';
import { ALICE_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { Actor } from '~/types/entity/actor';
import { createDefaultActors } from '~/testing/actors';
import { createWorldScenario } from '~/worldkit/scenario';
import { DebitCommand } from '~/command/DEBIT/types';
import { ErrorCode } from '~/types/error';

type Transform<T> = (x: T) => T;
const identity: Transform<any> = (x: any) => x;

describe('DEBIT Command Reducer', () => {
  let context: TransformerContext;
  let alice: Actor;

  // Specialized command factory for this test suite
  const createMockDebitCommand = (
    transform: Transform<DebitCommand> = identity,
  ): DebitCommand => {
    const baseCommand = createDebitCommand((c: DebitCommand) => ({
      ...c,
      location: DEFAULT_LOCATION,
      args: {
        ...c.args,
        recipient: ALICE_ID,
      },
    }));

    return transform ? transform(baseCommand) : baseCommand;
  };

  beforeEach(() => {
    const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice } = createDefaultActors(place.id));

    context = createTransformerContext((c) => ({
      ...c,
      declareEvent: vi.fn(),
      declareError: vi.fn(),
    }));

    createWorldScenario(context, {
      places: [place],
      actors: [alice],
    });

    // Clear mock calls between tests
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should debit funds from recipient actor', () => {
      setBalance(alice, CurrencyType.SCRAP, 150);

      const command = createMockDebitCommand();
      const resultContext = debitReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(100); // 150 - 50 (default debit amount)
      expect(resultContext).toBe(context); // Should return the same context
    });

    it('should debit funds from actor with exact balance', () => {
      setBalance(alice, CurrencyType.SCRAP, 75);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 75,
        },
      }));

      debitReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(0);
    });

    it('should handle large debit amounts', () => {
      const largeAmount = 1000000;
      setBalance(alice, CurrencyType.SCRAP, largeAmount + 500);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: largeAmount,
        },
      }));

      debitReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(500);
    });

    it('should handle zero debit amount', () => {
      const initialBalance = 100;
      setBalance(alice, CurrencyType.SCRAP, initialBalance);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 0,
        },
      }));

      debitReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(initialBalance);
    });

    it('should handle negative debit amount (should still deduct absolute value)', () => {
      setBalance(alice, CurrencyType.SCRAP, 100);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: -25,
        },
      }));

      debitReducer(context, command);

      // Transaction system should use absolute value, so -25 becomes -25 (debit)
      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(75);
    });
  });

  describe('Insufficient Funds Handling', () => {
    it('should declare error when recipient has insufficient funds', () => {
      setBalance(alice, CurrencyType.SCRAP, 25); // Less than default debit amount of 50

      const command = createMockDebitCommand();
      const resultContext = debitReducer(context, command);

      expect(context.declareError).toHaveBeenCalledTimes(1);
      expect(context.declareError).toHaveBeenCalledWith(ErrorCode.PRECONDITION_FAILED, command.id);
      expect(context.declareEvent).not.toHaveBeenCalled();
      expect(resultContext).toBe(context);
    });

    it('should not modify wallet when insufficient funds', () => {
      const initialBalance = 25;
      setBalance(alice, CurrencyType.SCRAP, initialBalance);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 100, // More than available
        },
      }));

      debitReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(initialBalance);
    });

    it('should allow debit when recipient has exactly enough funds', () => {
      setBalance(alice, CurrencyType.SCRAP, 50); // Exactly the default debit amount

      const command = createMockDebitCommand();
      debitReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(0);
      expect(context.declareError).not.toHaveBeenCalled();
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Declaration', () => {
    it('should declare currency transaction event', () => {
      setBalance(alice, CurrencyType.SCRAP, 150);

      const command = createMockDebitCommand();
      debitReducer(context, command);

      expect(context.declareEvent).toHaveBeenCalledTimes(1);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
      expect(declaredEvent.trace).toBe(command.id);
      expect(declaredEvent.actor).toBe(ALICE_ID);
      expect(declaredEvent.location).toBe(DEFAULT_LOCATION);
      expect(declaredEvent.payload.transaction.actorId).toBe(ALICE_ID);
      expect(declaredEvent.payload.transaction.currency).toBe(CurrencyType.SCRAP);
      expect(declaredEvent.payload.transaction.type).toBe(TransactionType.DEBIT);
      expect(declaredEvent.payload.transaction.amount).toBe(50); // Default debit amount
      expect(declaredEvent.payload.transaction.trace).toBe(command.id);
    });

    it('should create transaction with unique ID and timestamp', () => {
      setBalance(alice, CurrencyType.SCRAP, 100);

      const command = createMockDebitCommand();
      debitReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      const transaction = declaredEvent.payload.transaction;

      expect(typeof transaction.id).toBe('string');
      expect(transaction.id.length).toBeGreaterThan(0);
      expect(typeof transaction.ts).toBe('number');
      expect(transaction.ts).toBeGreaterThan(0);
    });

    it('should use command ID as transaction trace', () => {
      setBalance(alice, CurrencyType.SCRAP, 100);
      const commandId = 'unique-debit-command-id-123';

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        id: commandId,
      }));

      debitReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.payload.transaction.trace).toBe(commandId);
      expect(declaredEvent.trace).toBe(commandId);
    });
  });

  describe('Error Handling', () => {
    it('should declare error when recipient not found', () => {
      const nonExistentRecipient: ActorURN = 'flux:actor:missing:person';
      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: nonExistentRecipient,
          amount: 100,
        },
      }));

      const resultContext = debitReducer(context, command);

      expect(context.declareError).toHaveBeenCalledTimes(1);
      expect(context.declareError).toHaveBeenCalledWith(ErrorCode.NOT_FOUND, command.id);
      expect(context.declareEvent).not.toHaveBeenCalled();
      expect(resultContext).toBe(context);
    });

    it('should not modify wallet when recipient not found', () => {
      const nonExistentRecipient: ActorURN = 'flux:actor:missing:person';
      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: nonExistentRecipient,
          amount: 100,
        },
      }));

      // Ensure existing recipient balance is unchanged
      const initialBalance = 150;
      setBalance(alice, CurrencyType.SCRAP, initialBalance);

      debitReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(initialBalance);
    });
  });

  describe('Currency Type Support', () => {
    it('should handle all supported currency types', () => {

      Object.values(CurrencyType).forEach((currency) => {
        // Reset for each currency test
        vi.clearAllMocks();
        setBalance(alice, currency, 100); // Ensure sufficient funds

        const command = createMockDebitCommand((cmd) => ({
          ...cmd,
          args: {
            ...cmd.args,
            currency,
            amount: 25,
          },
        }));

        debitReducer(context, command);

        expect(getBalance(alice, currency)).toBe(75);
        expect(context.declareEvent).toHaveBeenCalledTimes(1);

        const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
        expect(declaredEvent.payload.transaction.currency).toBe(currency);
      });
    });
  });

  describe('Context Immutability', () => {
    it('should return the same context object', () => {
      setBalance(alice, CurrencyType.SCRAP, 100);

      const command = createMockDebitCommand();
      const resultContext = debitReducer(context, command);

      expect(resultContext).toBe(context);
    });

    it('should not create new context objects unnecessarily', () => {
      setBalance(alice, CurrencyType.SCRAP, 100);

      const originalWorld = context.world;
      const command = createMockDebitCommand();

      debitReducer(context, command);

      // World reference should remain the same (mutations are in-place)
      expect(context.world).toBe(originalWorld);
    });
  });

  describe('Integration with Transaction System', () => {
    it('should properly integrate with createCurrencyTransaction', () => {
      setBalance(alice, CurrencyType.SCRAP, 200);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 75,
        },
      }));

      debitReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      const transaction = declaredEvent.payload.transaction;

      // Verify transaction structure matches createCurrencyTransaction output
      expect(transaction).toMatchObject({
        actorId: alice.id,
        currency: CurrencyType.SCRAP,
        type: TransactionType.DEBIT,
        amount: 75, // Should be positive even if input was negative
        trace: command.id,
      });

      // Verify required fields are present
      expect(typeof transaction.id).toBe('string');
      expect(typeof transaction.ts).toBe('number');
    });

    it('should properly integrate with executeCurrencyTransaction', () => {
      const initialBalance = 300;
      setBalance(alice, CurrencyType.SCRAP, initialBalance);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 150,
        },
      }));

      debitReducer(context, command);

      // Verify wallet was updated correctly
      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(150);

      // Verify event was declared correctly
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum safe integer amounts', () => {
      setBalance(alice, CurrencyType.SCRAP, Number.MAX_SAFE_INTEGER);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 1000,
        },
      }));

      debitReducer(context, command);

      expect(getBalance(alice, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER - 1000);
    });

    it('should handle minimum safe integer amounts (negative)', () => {
      // Set balance to MAX_SAFE_INTEGER to ensure we have enough funds
      setBalance(alice, CurrencyType.SCRAP, Number.MAX_SAFE_INTEGER);

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: Number.MIN_SAFE_INTEGER,
        },
      }));

      const result = debitReducer(context, command);


      // Check if insufficient funds error was declared
      if ((context.declareError as any).mock?.calls?.length > 0) {
        // If insufficient funds, balance should remain unchanged
        expect(getBalance(alice, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER);
        expect(context.declareError).toHaveBeenCalledWith(ErrorCode.PRECONDITION_FAILED, command.id);
      } else {
        // If successful, should debit the absolute value
        expect(getBalance(alice, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER - Math.abs(Number.MIN_SAFE_INTEGER));
      }
    });

    it('should handle fractional amounts (should be handled by transaction system)', () => {
      setBalance(alice, CurrencyType.SCRAP, 200);

      // Note: This test assumes the parser would have already converted to integer,
      // but we test the reducer's robustness
      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 50.75,
        },
      }));

      debitReducer(context, command);

      // Transaction system should handle the fractional amount appropriately
      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(typeof declaredEvent.payload.transaction.amount).toBe('number');
    });
  });

  describe('Command Validation', () => {
    it('should work with different command IDs', () => {
      setBalance(alice, CurrencyType.SCRAP, 200);

      const commandIds = ['debit-cmd-1', 'debit-cmd-2', 'very-long-debit-command-id-with-special-chars-123'];

      commandIds.forEach((commandId) => {
        vi.clearAllMocks();
        setBalance(alice, CurrencyType.SCRAP, 200); // Reset balance

        const command = createMockDebitCommand((cmd) => ({
          ...cmd,
          id: commandId,
        }));

        debitReducer(context, command);

        const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
        expect(declaredEvent.trace).toBe(commandId);
        expect(declaredEvent.payload.transaction.trace).toBe(commandId);
      });
    });

    it('should work with different locations', () => {
      setBalance(alice, CurrencyType.SCRAP, 100);

      const differentPlace: PlaceURN = 'flux:place:test:different';
      context.world.places[differentPlace] = createPlace({
        id: differentPlace,
        name: 'Different Place',
      });

      // Move the recipient to the different place
      alice.location = differentPlace;

      const command = createMockDebitCommand((cmd) => ({
        ...cmd,
        location: differentPlace,
      }));

      debitReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      // Event location should be the actor's location, not the command's location
      expect(declaredEvent.location).toBe(differentPlace);
    });
  });
});
