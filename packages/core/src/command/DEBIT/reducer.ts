import { PureReducer, TransformerContext } from '~/types/handler';
import { DebitCommand } from './types';
import { createCurrencyTransaction, executeCurrencyTransaction, hasEnoughFunds } from '~/worldkit/entity/actor/wallet';
import { TransactionType } from '~/types/currency';

export const debitReducer: PureReducer<TransformerContext, DebitCommand> = (context, command) => {
  const { actors } = context.world;
  const recipient = actors[command.args.recipient];

  if (!recipient) {
    context.declareError(`DEBIT recipient not found in world projection`, command.id);
    return context;
  }

  // Check if the recipient has enough funds
  if (!hasEnoughFunds(recipient, command.args.currency, command.args.amount)) {
    context.declareError(`DEBIT recipient has insufficient funds`, command.id);
    return context;
  }

  const transaction = createCurrencyTransaction({
    trace: command.id,
    actorId: recipient.id,
    currency: command.args.currency,
    type: TransactionType.DEBIT,
    amount: command.args.amount,
  });

  executeCurrencyTransaction(context, recipient, transaction);

  return context;
};
