import { describe, beforeEach, it, expect, vi } from 'vitest';
import { debitReducer } from './reducer';
import { TransformerContext, WorldProjection } from '~/types/handler';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';
import { CurrencyType, TransactionType } from '~/types/currency';
import { getBalance, setBalance } from '~/worldkit/entity/actor/wallet';
import { EventType, ActorDidCompleteCurrencyTransaction } from '~/types/event';
import { createDebitCommand } from '~/testing/command/factory/currency';
import { BOB_ID, DEFAULT_LOCATION } from '~/testing/constants';

describe('DEBIT Command Reducer', () => {
  let context: TransformerContext;

  // Test entities
  const RECIPIENT_ID: ActorURN = BOB_ID;
  const PLACE_ID: PlaceURN = DEFAULT_LOCATION;

  beforeEach(() => {
    context = createTestTransformerContext({
      world: createWorldProjection((w: WorldProjection) => ({
        ...w,
        sessions: {},
        items: {},
        actors: {
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

    // Clear mock calls between tests
    vi.clearAllMocks();
  });

  // Specialized command factory for this test suite
  const createTestDebitCommand = (transform?: (cmd: ReturnType<typeof createDebitCommand>) => ReturnType<typeof createDebitCommand>) => {
    const baseCommand = createDebitCommand((cmd) => ({
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
    it('should debit funds from recipient actor', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 150);

      const command = createTestDebitCommand();
      const resultContext = debitReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(100); // 150 - 50 (default debit amount)
      expect(resultContext).toBe(context); // Should return the same context
    });

    it('should debit funds from actor with exact balance', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 75);

      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 75,
        },
      }));

      debitReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(0);
    });

    it('should handle large debit amounts', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      const largeAmount = 1000000;
      setBalance(recipient, CurrencyType.SCRAP, largeAmount + 500);

      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: largeAmount,
        },
      }));

      debitReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(500);
    });

    it('should handle zero debit amount', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      const initialBalance = 100;
      setBalance(recipient, CurrencyType.SCRAP, initialBalance);

      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 0,
        },
      }));

      debitReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(initialBalance);
    });

    it('should handle negative debit amount (should still deduct absolute value)', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 100);

      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: -25,
        },
      }));

      debitReducer(context, command);

      // Transaction system should use absolute value, so -25 becomes -25 (debit)
      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(75);
    });
  });

  describe('Insufficient Funds Handling', () => {
    it('should declare error when recipient has insufficient funds', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 25); // Less than default debit amount of 50

      const command = createTestDebitCommand();
      const resultContext = debitReducer(context, command);

      expect(context.declareError).toHaveBeenCalledTimes(1);
      expect(context.declareError).toHaveBeenCalledWith(
        'DEBIT recipient has insufficient funds',
        command.id
      );
      expect(context.declareEvent).not.toHaveBeenCalled();
      expect(resultContext).toBe(context);
    });

    it('should not modify wallet when insufficient funds', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      const initialBalance = 25;
      setBalance(recipient, CurrencyType.SCRAP, initialBalance);

      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 100, // More than available
        },
      }));

      debitReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(initialBalance);
    });

    it('should allow debit when recipient has exactly enough funds', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50); // Exactly the default debit amount

      const command = createTestDebitCommand();
      debitReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(0);
      expect(context.declareError).not.toHaveBeenCalled();
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Declaration', () => {
    it('should declare currency transaction event', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 150);

      const command = createTestDebitCommand();
      debitReducer(context, command);

      expect(context.declareEvent).toHaveBeenCalledTimes(1);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
      expect(declaredEvent.trace).toBe(command.id);
      expect(declaredEvent.actor).toBe(RECIPIENT_ID);
      expect(declaredEvent.location).toBe(DEFAULT_LOCATION);
      expect(declaredEvent.payload.transaction.actorId).toBe(RECIPIENT_ID);
      expect(declaredEvent.payload.transaction.currency).toBe(CurrencyType.SCRAP);
      expect(declaredEvent.payload.transaction.type).toBe(TransactionType.DEBIT);
      expect(declaredEvent.payload.transaction.amount).toBe(50); // Default debit amount
      expect(declaredEvent.payload.transaction.trace).toBe(command.id);
    });

    it('should create transaction with unique ID and timestamp', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 100);

      const command = createTestDebitCommand();
      debitReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      const transaction = declaredEvent.payload.transaction;

      expect(typeof transaction.id).toBe('string');
      expect(transaction.id.length).toBeGreaterThan(0);
      expect(typeof transaction.ts).toBe('number');
      expect(transaction.ts).toBeGreaterThan(0);
    });

    it('should use command ID as transaction trace', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 100);
      const commandId = 'unique-debit-command-id-123';

      const command = createTestDebitCommand((cmd) => ({
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
      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: nonExistentRecipient,
          amount: 100,
        },
      }));

      const resultContext = debitReducer(context, command);

      expect(context.declareError).toHaveBeenCalledTimes(1);
      expect(context.declareError).toHaveBeenCalledWith(
        'DEBIT recipient not found in world projection',
        command.id
      );
      expect(context.declareEvent).not.toHaveBeenCalled();
      expect(resultContext).toBe(context);
    });

    it('should not modify wallet when recipient not found', () => {
      const nonExistentRecipient: ActorURN = 'flux:actor:missing:person';
      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: nonExistentRecipient,
          amount: 100,
        },
      }));

      // Ensure existing recipient balance is unchanged
      const existingRecipient = context.world.actors[RECIPIENT_ID];
      const initialBalance = 150;
      setBalance(existingRecipient, CurrencyType.SCRAP, initialBalance);

      debitReducer(context, command);

      expect(getBalance(existingRecipient, CurrencyType.SCRAP)).toBe(initialBalance);
    });
  });

  describe('Currency Type Support', () => {
    it('should handle all supported currency types', () => {
      const recipient = context.world.actors[RECIPIENT_ID];

      Object.values(CurrencyType).forEach((currency) => {
        // Reset for each currency test
        vi.clearAllMocks();
        setBalance(recipient, currency, 100); // Ensure sufficient funds

        const command = createTestDebitCommand((cmd) => ({
          ...cmd,
          args: {
            ...cmd.args,
            currency,
            amount: 25,
          },
        }));

        debitReducer(context, command);

        expect(getBalance(recipient, currency)).toBe(75);
        expect(context.declareEvent).toHaveBeenCalledTimes(1);

        const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
        expect(declaredEvent.payload.transaction.currency).toBe(currency);
      });
    });
  });

  describe('Context Immutability', () => {
    it('should return the same context object', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 100);

      const command = createTestDebitCommand();
      const resultContext = debitReducer(context, command);

      expect(resultContext).toBe(context);
    });

    it('should not create new context objects unnecessarily', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 100);

      const originalWorld = context.world;
      const command = createTestDebitCommand();

      debitReducer(context, command);

      // World reference should remain the same (mutations are in-place)
      expect(context.world).toBe(originalWorld);
    });
  });

  describe('Integration with Transaction System', () => {
    it('should properly integrate with createCurrencyTransaction', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 200);

      const command = createTestDebitCommand((cmd) => ({
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
        actorId: RECIPIENT_ID,
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
      const recipient = context.world.actors[RECIPIENT_ID];
      const initialBalance = 300;
      setBalance(recipient, CurrencyType.SCRAP, initialBalance);

      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 150,
        },
      }));

      debitReducer(context, command);

      // Verify wallet was updated correctly
      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(150);

      // Verify event was declared correctly
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum safe integer amounts', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, Number.MAX_SAFE_INTEGER);

      const command = createTestDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 1000,
        },
      }));

      debitReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER - 1000);
    });

    it('should handle minimum safe integer amounts (negative)', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      // Set balance to MAX_SAFE_INTEGER to ensure we have enough funds
      setBalance(recipient, CurrencyType.SCRAP, Number.MAX_SAFE_INTEGER);

      const command = createTestDebitCommand((cmd) => ({
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
        expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER);
        expect(context.declareError).toHaveBeenCalledWith(
          'DEBIT recipient has insufficient funds',
          command.id
        );
      } else {
        // If successful, should debit the absolute value
        expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER - Math.abs(Number.MIN_SAFE_INTEGER));
      }
    });

    it('should handle fractional amounts (should be handled by transaction system)', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 200);

      // Note: This test assumes the parser would have already converted to integer,
      // but we test the reducer's robustness
      const command = createTestDebitCommand((cmd) => ({
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
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 200);

      const commandIds = ['debit-cmd-1', 'debit-cmd-2', 'very-long-debit-command-id-with-special-chars-123'];

      commandIds.forEach((commandId) => {
        vi.clearAllMocks();
        setBalance(recipient, CurrencyType.SCRAP, 200); // Reset balance

        const command = createTestDebitCommand((cmd) => ({
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
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 100);

      const differentPlace: PlaceURN = 'flux:place:test:different';
      context.world.places[differentPlace] = createPlace({
        id: differentPlace,
        name: 'Different Place',
      });

      // Move the recipient to the different place
      recipient.location = differentPlace;

      const command = createTestDebitCommand((cmd) => ({
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
