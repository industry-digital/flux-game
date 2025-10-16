import { PureReducer, TransformerContext } from '~/types/handler';
import { CreditCommand } from './types';
import { createCurrencyTransaction, executeCurrencyTransaction } from '~/worldkit/entity/actor/wallet';
import { TransactionType } from '~/types/currency';

export const creditReducer: PureReducer<TransformerContext, CreditCommand> = (context, command) => {
  const { actors } = context.world;
  const recipient = actors[command.args.recipient];

  if (!recipient) {
    context.declareError(`CREDIT recipient not found in world projection`, command.id);
    return context;
  }

  const transaction = createCurrencyTransaction({
    trace: command.id,
    actorId: recipient.id,
    currency: command.args.currency,
    type: TransactionType.CREDIT,
    amount: command.args.amount,
  });

  executeCurrencyTransaction(context, recipient, transaction);

  return context;
};
