import { PureReducer, TransformerContext } from '~/types/handler';
import { DebitCommand } from './types';
import { createCurrencyTransaction, executeCurrencyTransaction, hasEnoughFunds } from '~/worldkit/entity/actor/wallet';
import { TransactionType } from '~/types/currency';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { withBasicWorldStateValidation } from '~/command/validation';
import { ErrorCode } from '~/types/error';

const reducerCore: PureReducer<TransformerContext, DebitCommand> = (context, command) => {
  const { world, declareError } = context;
  const recipient = world.actors[command.args.recipient];

  if (!recipient) {
    declareError(ErrorCode.NOT_FOUND, command.id);
    return context;
  }

  // Check if the recipient has enough funds
  if (!hasEnoughFunds(recipient, command.args.currency, command.args.amount)) {
    declareError(ErrorCode.PRECONDITION_FAILED, command.id);
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

export const debitReducer: PureReducer<TransformerContext, DebitCommand> =
  withCommandType(CommandType.DEBIT,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );
