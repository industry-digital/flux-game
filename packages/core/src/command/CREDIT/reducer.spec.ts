import { describe, beforeEach, it, expect, vi } from 'vitest';
import { creditReducer } from './reducer';
import { TransformerContext } from '~/types/handler';
import { WorldProjection } from '~/types/world';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';
import { CurrencyType, TransactionType } from '~/types/currency';
import { getBalance, setBalance } from '~/worldkit/entity/actor/wallet';
import { EventType, ActorDidCompleteCurrencyTransaction } from '~/types/event';
import { createCreditCommand } from '~/testing/command/factory/currency';
import { BOB_ID, DEFAULT_LOCATION } from '~/testing/constants';

describe('CREDIT Command Reducer', () => {
  let context: TransformerContext;

  // Test entities
  const RECIPIENT_ID: ActorURN = BOB_ID;

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

  // Clear mock calls between tests
  vi.clearAllMocks();
});

// Specialized command factory for this test suite
const createTestCreditCommand = (transform?: (cmd: ReturnType<typeof createCreditCommand>) => ReturnType<typeof createCreditCommand>) => {
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
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const command = createTestCreditCommand();
      const resultContext = creditReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(150);
      expect(resultContext).toBe(context); // Should return the same context
    });

    it('should credit funds to actor with zero balance', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 0);

      const command = createCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: RECIPIENT_ID,
          currency: CurrencyType.SCRAP,
          amount: 75,
        },
      }));

      creditReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(75);
    });

    it('should handle large credit amounts', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 1000);

      const command = createTestCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: Number.MAX_SAFE_INTEGER - 1000,
        },
      }));

      creditReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero credit amount', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      const initialBalance = 100;
      setBalance(recipient, CurrencyType.SCRAP, initialBalance);

      const command = createTestCreditCommand((cmd) => ({
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

      const command = createTestCreditCommand((cmd) => ({
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
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const command = createTestCreditCommand();
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
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 0);

      const command = createTestCreditCommand();
      creditReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      const transaction = declaredEvent.payload.transaction;

      expect(typeof transaction.id).toBe('string');
      expect(transaction.id.length).toBeGreaterThan(0);
      expect(typeof transaction.ts).toBe('number');
      expect(transaction.ts).toBeGreaterThan(0);
    });

    it('should use command ID as transaction trace', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      const commandId = 'unique-command-id-123';

      const command = createTestCreditCommand((cmd) => ({
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

    it('should not modify wallet when recipient not found', () => {
      const nonExistentRecipient: ActorURN = 'flux:actor:missing:person';
      const command = createTestCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: nonExistentRecipient,
          amount: 100,
        },
      }));

      // Ensure existing recipient balance is unchanged
      const existingRecipient = context.world.actors[RECIPIENT_ID];
      const initialBalance = 50;
      setBalance(existingRecipient, CurrencyType.SCRAP, initialBalance);

      creditReducer(context, command);

      expect(getBalance(existingRecipient, CurrencyType.SCRAP)).toBe(initialBalance);
    });
  });

  describe('Currency Type Support', () => {
    it('should handle all supported currency types', () => {
      const recipient = context.world.actors[RECIPIENT_ID];

      Object.values(CurrencyType).forEach((currency) => {
        // Reset for each currency test
        vi.clearAllMocks();
        setBalance(recipient, currency, 25);

        const command = createTestCreditCommand((cmd) => ({
          ...cmd,
          args: {
            ...cmd.args,
            currency,
            amount: 50,
          },
        }));

        creditReducer(context, command);

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
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const command = createTestCreditCommand();
      const resultContext = creditReducer(context, command);

      expect(resultContext).toBe(context);
    });

    it('should not create new context objects unnecessarily', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const originalWorld = context.world;
      const command = createTestCreditCommand();

      creditReducer(context, command);

      // World reference should remain the same (mutations are in-place)
      expect(context.world).toBe(originalWorld);
    });
  });

  describe('Integration with Transaction System', () => {
    it('should properly integrate with createCurrencyTransaction', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 100);

      const command = createTestCreditCommand((cmd) => ({
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
        actorId: RECIPIENT_ID,
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
      const recipient = context.world.actors[RECIPIENT_ID];
      const initialBalance = 200;
      setBalance(recipient, CurrencyType.SCRAP, initialBalance);

      const command = createTestCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 150,
        },
      }));

      creditReducer(context, command);

      // Verify wallet was updated correctly
      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(350);

      // Verify event was declared correctly
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(declaredEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum safe integer amounts', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 0);

      const command = createTestCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: Number.MAX_SAFE_INTEGER,
        },
      }));

      creditReducer(context, command);

      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle minimum safe integer amounts (negative)', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 0);

      const command = createTestCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: Number.MIN_SAFE_INTEGER,
        },
      }));

      creditReducer(context, command);

      // Should credit the absolute value
      expect(getBalance(recipient, CurrencyType.SCRAP)).toBe(Math.abs(Number.MIN_SAFE_INTEGER));
    });

    it('should handle fractional amounts (should be handled by transaction system)', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 100);

      // Note: This test assumes the parser would have already converted to integer,
      // but we test the reducer's robustness
      const command = createTestCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 50.75,
        },
      }));

      creditReducer(context, command);

      // Transaction system should handle the fractional amount appropriately
      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      expect(typeof declaredEvent.payload.transaction.amount).toBe('number');
    });
  });

  describe('Command Validation', () => {
    it('should work with different command IDs', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const commandIds = ['cmd-1', 'cmd-2', 'very-long-command-id-with-special-chars-123'];

      commandIds.forEach((commandId) => {
        vi.clearAllMocks();

      const command = createTestCreditCommand((cmd) => ({
        ...cmd,
        id: commandId,
      }));

        creditReducer(context, command);

        const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
        expect(declaredEvent.trace).toBe(commandId);
        expect(declaredEvent.payload.transaction.trace).toBe(commandId);
      });
    });

    it('should work with different locations', () => {
      const recipient = context.world.actors[RECIPIENT_ID];
      setBalance(recipient, CurrencyType.SCRAP, 50);

      const differentPlace: PlaceURN = 'flux:place:test:different';
      context.world.places[differentPlace] = createPlace({
        id: differentPlace,
        name: 'Different Place',
      });

      // Move the recipient to the different place
      recipient.location = differentPlace;

      const command = createTestCreditCommand((cmd) => ({
        ...cmd,
        location: differentPlace,
      }));

      creditReducer(context, command);

      const declaredEvent = (context.declareEvent as any).mock.calls[0][0] as ActorDidCompleteCurrencyTransaction;
      // Event location should be the actor's location, not the command's location
      expect(declaredEvent.location).toBe(differentPlace);
    });
  });
});
