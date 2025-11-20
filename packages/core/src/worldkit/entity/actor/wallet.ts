import { Actor } from '~/types/entity/actor';
import { CurrencyTransaction, CurrencyTransactionInput, CurrencyType, TransactionType } from '~/types/currency';
import { createWorldEvent } from '~/worldkit/event';
import { ActorDidCompleteCurrencyTransaction, EventType, WorldEvent } from '~/types/event';
import { uniqid, BASE62_CHARSET } from '~/lib/random';
import { TransformerContext } from '~/types/handler';
import { timestamp } from '~/lib/timestamp';

const ALLOWED_CURRENCIES: readonly CurrencyType[] = Object.values(CurrencyType);

export type CurrencyDependencies = {
  uniqid: () => string;
  timestamp: () => number;
};

export const DEFAULT_CURRENCY_DEPS: Readonly<CurrencyDependencies> = {
  uniqid: () => uniqid(24, BASE62_CHARSET),
  timestamp,
};

export type CreateCurrencyDependencies = Partial<CurrencyDependencies>;

/**
 * Create a currency transaction record
 */
export const createCurrencyTransaction = (
  input: CurrencyTransactionInput,
  deps: CurrencyDependencies = DEFAULT_CURRENCY_DEPS,
): CurrencyTransaction => {
  return {
    id: input.id ?? deps.uniqid(),
    ts: input.ts ?? deps.timestamp(),
    trace: input.trace,
    actorId: input.actorId,
    currency: input.currency,
    type: input.type,
    amount: Math.abs(input.amount),
  };
};

// ============================================================================
// LAYER 1: PURE CURRENCY OPERATIONS (No Events)
// ============================================================================

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
 * Clear all funds from wallet
 * Directly mutates the actor's wallet state
 */
export const clearWallet = (actor: Actor): void => {
  actor.wallet = {};
};

/**
 * Default starting balance for new wallets
 */
export const DEFAULT_CURRENCY_BALANCE = 0;

/**
 * Initialize wallet with default starting funds
 * Directly mutates the actor's wallet state
 */
export const initializeWallet = (actor: Actor): void => {
  for (const currency of ALLOWED_CURRENCIES) {
    setBalance(actor, currency, DEFAULT_CURRENCY_BALANCE);
  }
};

// ============================================================================
// LAYER 2: TRANSACTION EXECUTION (Events)
// ============================================================================


/**
 * Execute a currency transaction and automatically declare the appropriate event
 * Takes a pre-created transaction, applies it to the actor's wallet, and declares the event
 */
export const executeCurrencyTransaction = (
  context: TransformerContext,
  actor: Actor,
  transaction: CurrencyTransaction,
  output: WorldEvent[] = [], // Consumers may opt into zero-allocation
): WorldEvent[] => {

  // Apply the transaction to the actor's wallet
  if (transaction.type === TransactionType.DEBIT) {
    deductFunds(actor, transaction.currency, transaction.amount);
  } else if (transaction.type === TransactionType.CREDIT) {
    addFunds(actor, transaction.currency, transaction.amount);
  } else {
    context.declareError(`Unknown transaction type: ${transaction.type}`);
    return [];
  }

  // Create and automatically declare the event
  const event: ActorDidCompleteCurrencyTransaction = createWorldEvent({
    type: EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION,
    trace: transaction.trace,
    location: actor.location,
    actor: actor.id,
    payload: {
      transaction,
    },
  });


  output.push(event);
  context.declareEvent(event);

  return output;
};
