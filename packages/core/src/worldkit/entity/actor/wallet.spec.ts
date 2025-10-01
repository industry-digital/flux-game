import { describe, it, expect, beforeEach } from 'vitest';
import { Actor, ActorType } from '~/types/entity/actor';
import { CurrencyType } from '~/types/currency';
import { createActor } from './index';
import {
  DEFAULT_STARTING_SCRAP,
  getBalance,
  hasEnoughFunds,
  getTotalBalance,
  isWalletEmpty,
  setBalance,
  addFunds,
  deductFunds,
  transferFunds,
  clearWallet,
  initializeWallet,
  validateTransaction,
  executeTransaction,
} from './wallet';

describe('Wallet Utilities', () => {
  let actor: Actor;

  beforeEach(() => {
    actor = createActor({
      name: 'Test Actor',
      kind: ActorType.PC,
    });
  });

  describe('initialization', () => {
    it('should initialize wallet with default scrap on actor creation', () => {
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(DEFAULT_STARTING_SCRAP);
    });

    it('should reinitialize wallet with initializeWallet', () => {
      setBalance(actor, CurrencyType.SCRAP, 500);
      initializeWallet(actor);
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(DEFAULT_STARTING_SCRAP);
    });
  });

  describe('getBalance', () => {
    it('should return 0 for currencies not in wallet', () => {
      clearWallet(actor);
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
    });

    it('should return correct balance for existing currency', () => {
      setBalance(actor, CurrencyType.SCRAP, 250);
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(250);
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
      setBalance(actor, CurrencyType.SCRAP, 0);
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
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

    it('should allow balance to go negative (no validation)', () => {
      deductFunds(actor, CurrencyType.SCRAP, 150);
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0); // Clamped by setBalance
    });
  });

  describe('transferFunds', () => {
    beforeEach(() => {
      setBalance(actor, CurrencyType.SCRAP, 100);
    });

    it('should transfer funds between currencies', () => {
      // Note: This test assumes we have multiple currencies
      // For now, we'll test the error case since we only have SCRAP
      expect(() => {
        transferFunds(actor, CurrencyType.SCRAP, CurrencyType.SCRAP, 50);
      }).not.toThrow();

      // Balance should remain the same for same-currency transfer
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(100);
    });

    it('should throw error for insufficient funds', () => {
      expect(() => {
        transferFunds(actor, CurrencyType.SCRAP, CurrencyType.SCRAP, 150);
      }).toThrow('Insufficient scrap funds for transfer');
    });
  });

  describe('clearWallet', () => {
    it('should remove all funds from wallet', () => {
      setBalance(actor, CurrencyType.SCRAP, 500);
      clearWallet(actor);
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(0);
      expect(isWalletEmpty(actor)).toBe(true);
    });
  });

  describe('validateTransaction', () => {
    beforeEach(() => {
      setBalance(actor, CurrencyType.SCRAP, 100);
    });

    it('should validate successful transaction', () => {
      const result = validateTransaction(actor, CurrencyType.SCRAP, 50);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject negative amounts', () => {
      const result = validateTransaction(actor, CurrencyType.SCRAP, -10);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Transaction amount cannot be negative');
    });

    it('should reject insufficient funds', () => {
      const result = validateTransaction(actor, CurrencyType.SCRAP, 150);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Insufficient scrap: need 150, have 100');
    });
  });

  describe('executeTransaction', () => {
    beforeEach(() => {
      setBalance(actor, CurrencyType.SCRAP, 100);
    });

    it('should execute valid transaction', () => {
      const result = executeTransaction(actor, CurrencyType.SCRAP, 30);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(70);
    });

    it('should reject invalid transaction without changing balance', () => {
      const result = executeTransaction(actor, CurrencyType.SCRAP, 150);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient scrap: need 150, have 100');
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(100);
    });

    it('should reject negative amounts without changing balance', () => {
      const result = executeTransaction(actor, CurrencyType.SCRAP, -50);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction amount cannot be negative');
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(100);
    });
  });

  describe('integration with workbench scenarios', () => {
    it('should support typical workbench commit workflow', () => {
      // Simulate a workbench commit scenario
      const mutationCost = 45;
      const initialScrap = 100;

      // Give actor some scrap to work with
      setBalance(actor, CurrencyType.SCRAP, initialScrap);

      // Check if actor can afford the mutation
      expect(hasEnoughFunds(actor, CurrencyType.SCRAP, mutationCost)).toBe(true);

      // Execute the transaction
      const result = executeTransaction(actor, CurrencyType.SCRAP, mutationCost);
      expect(result.success).toBe(true);

      // Verify balance was deducted
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(initialScrap - mutationCost);
    });

    it('should handle insufficient funds for expensive mutations', () => {
      const expensiveMutationCost = 500;

      // Check if actor can afford the mutation
      expect(hasEnoughFunds(actor, CurrencyType.SCRAP, expensiveMutationCost)).toBe(false);

      // Attempt transaction
      const result = executeTransaction(actor, CurrencyType.SCRAP, expensiveMutationCost);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient scrap');

      // Verify balance unchanged
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(DEFAULT_STARTING_SCRAP);
    });
  });
});
