import { Actor } from '~/types/entity/actor';
import { CurrencyType } from '~/types/currency';

/**
 * Default starting balance for new wallets
 */
export const DEFAULT_STARTING_SCRAP = 0;

/**
 * Get balance for a specific currency
 */
export const getBalance = (actor: Actor, currency: CurrencyType): number => {
  return actor.wallet[currency] ?? 0;
};

/**
 * Check if actor has enough funds for a transaction
 */
export const hasEnoughFunds = (actor: Actor, currency: CurrencyType, amount: number): boolean => {
  return getBalance(actor, currency) >= amount;
};

/**
 * Get total balance across all currencies (for display purposes)
 */
export const getTotalBalance = (actor: Actor): number => {
  return Object.values(actor.wallet).reduce((total, balance) => total + (balance ?? 0), 0);
};

/**
 * Check if wallet is empty (no funds in any currency)
 */
export const isWalletEmpty = (actor: Actor): boolean => {
  return getTotalBalance(actor) === 0;
};

/**
 * Set balance for a specific currency directly
 * Directly mutates the actor's wallet state
 */
export const setBalance = (actor: Actor, currency: CurrencyType, amount: number): void => {
  const clampedAmount = Math.max(0, amount);
  actor.wallet[currency] = clampedAmount;
};

/**
 * Add funds to a specific currency
 * Directly mutates the actor's wallet state
 */
export const addFunds = (actor: Actor, currency: CurrencyType, amount: number): void => {
  const currentBalance = getBalance(actor, currency);
  const newBalance = currentBalance + Math.abs(amount);
  setBalance(actor, currency, newBalance);
};

/**
 * Deduct funds from a specific currency
 * Directly mutates the actor's wallet state
 * Does not validate sufficient funds - use hasEnoughFunds() first
 */
export const deductFunds = (actor: Actor, currency: CurrencyType, amount: number): void => {
  const currentBalance = getBalance(actor, currency);
  const newBalance = currentBalance - Math.abs(amount);
  setBalance(actor, currency, newBalance);
};

/**
 * Transfer funds between currencies (for exchange systems)
 * Directly mutates the actor's wallet state
 */
export const transferFunds = (
  actor: Actor,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType,
  amount: number
): void => {
  if (!hasEnoughFunds(actor, fromCurrency, amount)) {
    throw new Error(`Insufficient ${fromCurrency} funds for transfer`);
  }
  deductFunds(actor, fromCurrency, amount);
  addFunds(actor, toCurrency, amount);
};

/**
 * Clear all funds from wallet
 * Directly mutates the actor's wallet state
 */
export const clearWallet = (actor: Actor): void => {
  actor.wallet = {};
};

/**
 * Initialize wallet with default starting funds
 * Directly mutates the actor's wallet state
 */
export const initializeWallet = (actor: Actor): void => {
  actor.wallet = {
    [CurrencyType.SCRAP]: DEFAULT_STARTING_SCRAP,
  };
};

/**
 * Validate a transaction without executing it
 */
export const validateTransaction = (
  actor: Actor,
  currency: CurrencyType,
  amount: number
): { valid: boolean; error?: string } => {
  if (amount < 0) {
    return { valid: false, error: 'Transaction amount cannot be negative' };
  }

  if (!hasEnoughFunds(actor, currency, amount)) {
    const balance = getBalance(actor, currency);
    return {
      valid: false,
      error: `Insufficient ${currency}: need ${amount}, have ${balance}`
    };
  }

  return { valid: true };
};

/**
 * Execute a safe transaction with validation
 * Returns success status and error message if failed
 */
export const executeTransaction = (
  actor: Actor,
  currency: CurrencyType,
  amount: number
): { success: boolean; error?: string } => {
  const validation = validateTransaction(actor, currency, amount);

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  deductFunds(actor, currency, amount);
  return { success: true };
};
