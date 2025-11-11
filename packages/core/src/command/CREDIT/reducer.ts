import { PureReducer, TransformerContext } from '~/types/handler';
import { CreditCommand } from './types';
import { createCurrencyTransaction, executeCurrencyTransaction } from '~/worldkit/entity/actor/wallet';
import { TransactionType } from '~/types/currency';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { ErrorCode } from '~/types/error';
import { withBasicWorldStateValidation } from '~/command/validation';

const reducerCore: PureReducer<TransformerContext, CreditCommand> = (context, command) => {
  const { world, declareError } = context;
  const recipient = world.actors[command.args.recipient];

  if (!recipient) {
    declareError(ErrorCode.NOT_FOUND, command.id);
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

export const creditReducer: PureReducer<TransformerContext, CreditCommand> =
  withCommandType(CommandType.CREDIT,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );
