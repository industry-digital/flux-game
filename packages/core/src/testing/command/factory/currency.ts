import { CreditCommand } from '~/command/CREDIT/types';
import { DebitCommand } from '~/command/DEBIT/types';
import { CommandType } from '~/types/intent';
import { CurrencyType } from '~/types/currency';
import { WellKnownActor } from '~/types';
import { CommandFactoryDependencies, DEFAULT_COMMAND_FACTORY_DEPS } from './deps';
import {
  DEFAULT_LOCATION,
  ALICE_ID,
  DEFAULT_CURRENCY_SESSION,
  DEFAULT_TRACE,
} from '~/testing/constants';

// Transform function types for each factory
export type CreditCommandTransform = (command: CreditCommand) => CreditCommand;
export type DebitCommandTransform = (command: DebitCommand) => DebitCommand;

/**
 * Factory for creating CREDIT commands with sensible defaults
 *
 * @example
 * ```typescript
 * // Basic credit command
 * const creditCommand = createCreditCommand();
 *
 * // Custom recipient and amount
 * const customCredit = createCreditCommand((cmd) => ({
 *   ...cmd,
 *   args: {
 *     ...cmd.args,
 *     recipient: BOB_ID,
 *     amount: 500
 *   }
 * }));
 *
 * // Multiple customizations
 * const complexCredit = createCreditCommand((cmd) => ({
 *   ...cmd,
 *   trace: 'custom-trace',
 *   args: {
 *     ...cmd.args,
 *     recipient: BOB_ID,
 *     amount: 1000,
 *   }
 * }));
 * ```
 */
export const createCreditCommand = (
  transform?: CreditCommandTransform,
  deps: CommandFactoryDependencies = DEFAULT_COMMAND_FACTORY_DEPS
): CreditCommand => {
  const baseCommand: CreditCommand = deps.createActorCommand({
    id: deps.uniqid(),
    type: CommandType.CREDIT,
    actor: WellKnownActor.SYSTEM,
    location: DEFAULT_LOCATION,
    session: DEFAULT_CURRENCY_SESSION,
    trace: DEFAULT_TRACE,
    args: {
      recipient: ALICE_ID,
      currency: CurrencyType.SCRAP,
      amount: 100,
    },
  });

  return transform ? transform(baseCommand) : baseCommand;
};

/**
 * Factory for creating DEBIT commands with sensible defaults
 *
 * @example
 * ```typescript
 * // Basic debit command
 * const debitCommand = createDebitCommand();
 *
 * // Custom recipient and amount
 * const customDebit = createDebitCommand((cmd) => ({
 *   ...cmd,
 *   args: {
 *     ...cmd.args,
 *     recipient: BOB_ID,
 *     amount: 250
 *   }
 * }));
 *
 * // Multiple customizations
 * const complexDebit = createDebitCommand((cmd) => ({
 *   ...cmd,
 *   trace: 'payment-trace',
 *   args: {
 *     ...cmd.args,
 *     recipient: BOB_ID,
 *     amount: 500,
 *   }
 * }));
 * ```
 */
export const createDebitCommand = (
  transform?: DebitCommandTransform,
  deps: CommandFactoryDependencies = DEFAULT_COMMAND_FACTORY_DEPS
): DebitCommand => {
  const baseCommand: DebitCommand = deps.createActorCommand({
    id: deps.uniqid(),
    type: CommandType.DEBIT,
    actor: WellKnownActor.SYSTEM,
    location: DEFAULT_LOCATION,
    session: DEFAULT_CURRENCY_SESSION,
    trace: DEFAULT_TRACE,
    args: {
      recipient: ALICE_ID,
      currency: CurrencyType.SCRAP,
      amount: 50,
    },
  });

  return transform ? transform(baseCommand) : baseCommand;
};
