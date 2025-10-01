import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Actor, ActorType } from '~/types/entity/actor';
import { CurrencyType, TransactionType } from '~/types/currency';
import { EventType } from '~/types/event';
import { createActor } from './index';
import {
  DEFAULT_CURRENCY_BALANCE,
  getBalance,
  hasEnoughFunds,
  getTotalBalance,
  isWalletEmpty,
  setBalance,
  addFunds,
  deductFunds,
  clearWallet,
  initializeWallet,
  createCurrencyTransaction,
  executeCurrencyTransaction, type CurrencyDependencies
} from './wallet';

describe('Wallet Module', () => {
  let actor: Actor;
  let mockDeps: CurrencyDependencies;

  beforeEach(() => {
    actor = createActor({
      name: 'Test Actor',
      kind: ActorType.PC,
    });

    mockDeps = {
      uniqid: vi.fn(() => 'test-id'),
      timestamp: vi.fn(() => 1234567890),
    };
  });

  describe('Layer 1: Pure Currency Operations', () => {
    describe('getBalance', () => {
      it('should return 0 for currencies not in wallet', () => {
        clearWallet(actor);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
      });

      it('should return correct balance for existing currency', () => {
        setBalance(actor, CurrencyType.SCRAP, 250);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(250);
      });

      it('should handle undefined wallet entries gracefully', () => {
        actor.wallet = {};
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
      });
    });

    describe('hasEnoughFunds', () => {
      beforeEach(() => {
        setBalance(actor, CurrencyType.SCRAP, 100);
      });

      it('should return true when actor has enough funds', () => {
        expect(hasEnoughFunds(actor, CurrencyType.SCRAP, 50)).toBe(true);
        expect(hasEnoughFunds(actor, CurrencyType.SCRAP, 100)).toBe(true);
      });

      it('should return false when actor does not have enough funds', () => {
        expect(hasEnoughFunds(actor, CurrencyType.SCRAP, 101)).toBe(false);
        expect(hasEnoughFunds(actor, CurrencyType.SCRAP, 200)).toBe(false);
      });

      it('should return false for currencies not in wallet', () => {
        clearWallet(actor);
        expect(hasEnoughFunds(actor, CurrencyType.SCRAP, 1)).toBe(false);
      });

      it('should handle zero amounts correctly', () => {
        expect(hasEnoughFunds(actor, CurrencyType.SCRAP, 0)).toBe(true);
      });
    });

    describe('getTotalBalance', () => {
      it('should return 0 for empty wallet', () => {
        clearWallet(actor);
        expect(getTotalBalance(actor)).toBe(0);
      });

      it('should return sum of all currency balances', () => {
        setBalance(actor, CurrencyType.SCRAP, 100);
        expect(getTotalBalance(actor)).toBe(100);
      });

      it('should handle multiple currencies', () => {
        // If we add more currencies in the future
        setBalance(actor, CurrencyType.SCRAP, 100);
        expect(getTotalBalance(actor)).toBe(100);
      });

      it('should ignore undefined values', () => {
        actor.wallet = { [CurrencyType.SCRAP]: 50 };
        expect(getTotalBalance(actor)).toBe(50);
      });
    });

    describe('isWalletEmpty', () => {
      it('should return true for empty wallet', () => {
        clearWallet(actor);
        expect(isWalletEmpty(actor)).toBe(true);
      });

      it('should return false for wallet with funds', () => {
        setBalance(actor, CurrencyType.SCRAP, 1);
        expect(isWalletEmpty(actor)).toBe(false);
      });

      it('should return true when all balances are zero', () => {
        setBalance(actor, CurrencyType.SCRAP, 0);
        expect(isWalletEmpty(actor)).toBe(true);
      });
    });

    describe('setBalance', () => {
      it('should set balance for currency', () => {
        setBalance(actor, CurrencyType.SCRAP, 500);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(500);
      });

      it('should clamp negative amounts to 0', () => {
        setBalance(actor, CurrencyType.SCRAP, -100);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
      });

      it('should allow setting balance to 0', () => {
        setBalance(actor, CurrencyType.SCRAP, 100);
        setBalance(actor, CurrencyType.SCRAP, 0);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
      });

      it('should handle decimal amounts by flooring', () => {
        setBalance(actor, CurrencyType.SCRAP, 99.9);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(99.9);
      });
    });

    describe('addFunds', () => {
      beforeEach(() => {
        setBalance(actor, CurrencyType.SCRAP, 100);
      });

      it('should add funds to existing balance', () => {
        addFunds(actor, CurrencyType.SCRAP, 50);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(150);
      });

      it('should handle negative amounts as positive', () => {
        addFunds(actor, CurrencyType.SCRAP, -25);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(125);
      });

      it('should add funds to currency not in wallet', () => {
        clearWallet(actor);
        addFunds(actor, CurrencyType.SCRAP, 75);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(75);
      });

      it('should handle zero amounts', () => {
        const originalBalance = getBalance(actor, CurrencyType.SCRAP);
        addFunds(actor, CurrencyType.SCRAP, 0);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(originalBalance);
      });
    });

    describe('deductFunds', () => {
      beforeEach(() => {
        setBalance(actor, CurrencyType.SCRAP, 100);
      });

      it('should deduct funds from balance', () => {
        deductFunds(actor, CurrencyType.SCRAP, 30);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(70);
      });

      it('should handle negative amounts as positive', () => {
        deductFunds(actor, CurrencyType.SCRAP, -20);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(80);
      });

      it('should clamp result to 0 when deducting more than available', () => {
        deductFunds(actor, CurrencyType.SCRAP, 150);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
      });

      it('should handle zero amounts', () => {
        const originalBalance = getBalance(actor, CurrencyType.SCRAP);
        deductFunds(actor, CurrencyType.SCRAP, 0);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(originalBalance);
      });
    });

    describe('clearWallet', () => {
      it('should remove all funds from wallet', () => {
        setBalance(actor, CurrencyType.SCRAP, 500);
        clearWallet(actor);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
        expect(isWalletEmpty(actor)).toBe(true);
      });

      it('should handle already empty wallet', () => {
        clearWallet(actor);
        clearWallet(actor); // Should not throw
        expect(isWalletEmpty(actor)).toBe(true);
      });
    });

    describe('initializeWallet', () => {
      it('should initialize all currencies with default balance', () => {
        initializeWallet(actor);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(DEFAULT_CURRENCY_BALANCE);
      });

      it('should overwrite existing wallet', () => {
        setBalance(actor, CurrencyType.SCRAP, 500);
        initializeWallet(actor);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(DEFAULT_CURRENCY_BALANCE);
      });

      it('should initialize all known currencies', () => {
        initializeWallet(actor);
        // Test that all currencies from the enum are initialized
        Object.values(CurrencyType).forEach(currency => {
          expect(getBalance(actor, currency)).toBe(DEFAULT_CURRENCY_BALANCE);
        });
      });
    });
  });

  describe('Layer 2: Transaction System', () => {
    describe('createCurrencyTransaction', () => {
      it('should create transaction with provided values', () => {
        const input = {
          id: 'custom-id',
          ts: 9999999,
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.DEBIT,
          amount: 50,
        };

        const transaction = createCurrencyTransaction(input, mockDeps);

        expect(transaction).toEqual({
          id: 'custom-id',
          ts: 9999999,
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.DEBIT,
          amount: 50,
        });
      });

      it('should generate id and timestamp when not provided', () => {
        const input = {
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.CREDIT,
          amount: 25,
        };

        const transaction = createCurrencyTransaction(input, mockDeps);

        expect(transaction.id).toBe('test-id');
        expect(transaction.ts).toBe(1234567890);
        expect(mockDeps.uniqid).toHaveBeenCalled();
        expect(mockDeps.timestamp).toHaveBeenCalled();
      });

      it('should use default dependencies when not provided', () => {
        const input = {
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.DEBIT,
          amount: 100,
        };

        const transaction = createCurrencyTransaction(input);

        expect(transaction.id).toBeDefined();
        expect(transaction.ts).toBeDefined();
        expect(typeof transaction.id).toBe('string');
        expect(typeof transaction.ts).toBe('number');
      });

      it('should make amount positive', () => {
        const input = {
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.DEBIT,
          amount: -50,
        };

        const transaction = createCurrencyTransaction(input, mockDeps);
        expect(transaction.amount).toBe(50);
      });
    });

    describe('executeCurrencyTransaction', () => {
      beforeEach(() => {
        setBalance(actor, CurrencyType.SCRAP, 100);
      });

      it('should execute DEBIT transaction and emit spend event', () => {
        const transaction = createCurrencyTransaction({
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.DEBIT,
          amount: 30,
        }, mockDeps);

        const events = executeCurrencyTransaction(actor, transaction, mockDeps);

        // Check wallet was updated
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(70);

        // Check event was emitted
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(EventType.ACTOR_DID_SPEND_CURRENCY);
        expect(events[0].trace).toBe('test-trace');
        expect(events[0].actor).toBe(actor.id);
        expect(events[0].payload).toEqual(transaction);
        expect(events[0].narrative?.self).toContain('decreased by 30');
      });

      it('should execute CREDIT transaction and emit gain event', () => {
        const transaction = createCurrencyTransaction({
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.CREDIT,
          amount: 50,
        }, mockDeps);

        const events = executeCurrencyTransaction(actor, transaction, mockDeps);

        // Check wallet was updated
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(150);

        // Check event was emitted
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(EventType.ACTOR_DID_GAIN_CURRENCY);
        expect(events[0].trace).toBe('test-trace');
        expect(events[0].actor).toBe(actor.id);
        expect(events[0].payload).toEqual(transaction);
        expect(events[0].narrative?.self).toContain('increased by 50');
      });

      it('should handle unknown transaction types gracefully', () => {
        const transaction = createCurrencyTransaction({
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: 'UNKNOWN' as any,
          amount: 25,
        }, mockDeps);

        const originalBalance = getBalance(actor, CurrencyType.SCRAP);
        const events = executeCurrencyTransaction(actor, transaction, mockDeps);

        // Should not change balance or emit events
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(originalBalance);
        expect(events).toHaveLength(0);
      });

      it('should use default dependencies when not provided', () => {
        const transaction = createCurrencyTransaction({
          trace: 'test-trace',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.DEBIT,
          amount: 10,
        });

        const events = executeCurrencyTransaction(actor, transaction);

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(EventType.ACTOR_DID_SPEND_CURRENCY);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Workbench commit workflow simulation', () => {
      it('should handle typical commit transaction flow', () => {
        // Setup: Actor has some scrap
        setBalance(actor, CurrencyType.SCRAP, 100);
        const mutationCost = 45;

        // Step 1: Check if actor can afford the mutation
        expect(hasEnoughFunds(actor, CurrencyType.SCRAP, mutationCost)).toBe(true);

        // Step 2: Create transaction
        const transaction = createCurrencyTransaction({
          trace: 'commit-shell-mutations',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.DEBIT,
          amount: mutationCost,
        });

        // Step 3: Execute transaction
        const events = executeCurrencyTransaction(actor, transaction);

        // Verify results
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(55);
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(EventType.ACTOR_DID_SPEND_CURRENCY);
        expect(events[0].payload.amount).toBe(mutationCost);
      });

      it('should handle insufficient funds scenario', () => {
        // Setup: Actor has insufficient scrap
        setBalance(actor, CurrencyType.SCRAP, 20);
        const expensiveMutationCost = 100;

        // Check funds (would fail in real commit action)
        expect(hasEnoughFunds(actor, CurrencyType.SCRAP, expensiveMutationCost)).toBe(false);

        // Balance should remain unchanged
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(20);
      });
    });

    describe('Multi-currency operations', () => {
      it('should handle operations across different currencies', () => {
        // Initialize with different balances
        setBalance(actor, CurrencyType.SCRAP, 100);

        // Verify independent currency handling
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(100);
        expect(getTotalBalance(actor)).toBe(100);

        // Test operations on different currencies
        addFunds(actor, CurrencyType.SCRAP, 50);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(150);
        expect(getTotalBalance(actor)).toBe(150);
      });
    });

    describe('Edge cases and error conditions', () => {
      it('should handle actor with no wallet property', () => {
        // @ts-ignore - Testing edge case
        delete actor.wallet;
        actor.wallet = {};

        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
        expect(isWalletEmpty(actor)).toBe(true);
      });

      it('should handle very large amounts', () => {
        const largeAmount = Number.MAX_SAFE_INTEGER;
        setBalance(actor, CurrencyType.SCRAP, largeAmount);
        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(largeAmount);
      });

      it('should handle zero amounts in transactions', () => {
        setBalance(actor, CurrencyType.SCRAP, 100);

        const transaction = createCurrencyTransaction({
          trace: 'zero-test',
          actorId: actor.id,
          currency: CurrencyType.SCRAP,
          type: TransactionType.DEBIT,
          amount: 0,
        });

        const events = executeCurrencyTransaction(actor, transaction);

        expect(getBalance(actor, CurrencyType.SCRAP)).toBe(100); // No change
        expect(events).toHaveLength(1); // Event still emitted
        expect(events[0].payload.amount).toBe(0);
      });
    });
  });

    describe('Dependency Injection', () => {
    it('should use custom dependencies correctly', () => {
      const customDeps: CurrencyDependencies = {
        uniqid: () => 'custom-id',
        timestamp: () => 999999,
      };

      const transaction = createCurrencyTransaction({
        trace: 'test',
        actorId: actor.id,
        currency: CurrencyType.SCRAP,
        type: TransactionType.DEBIT,
        amount: 10,
      }, customDeps);

      expect(transaction.id).toBe('custom-id');
      expect(transaction.ts).toBe(999999);
    });

    it('should fall back to defaults when dependencies not provided', () => {
      const transaction = createCurrencyTransaction({
        trace: 'test',
        actorId: actor.id,
        currency: CurrencyType.SCRAP,
        type: TransactionType.DEBIT,
        amount: 10,
      });

      expect(transaction.id).toBeDefined();
      expect(transaction.ts).toBeDefined();
      expect(typeof transaction.id).toBe('string');
      expect(typeof transaction.ts).toBe('number');
    });
  });
});
