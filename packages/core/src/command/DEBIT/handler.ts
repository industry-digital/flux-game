import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { DebitCommand, DebitCommandArgs } from './types';
import { debitReducer } from './reducer';
import { debitResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class DEBIT implements PureHandlerInterface<TransformerContext, DebitCommand> {
  type = CommandType.DEBIT;
  dependencies = [];
  reduce = debitReducer;
  resolve = debitResolver;
  handles = (command: Command): command is DebitCommand => {
    return isCommandOfType<CommandType.DEBIT, DebitCommandArgs>(command, CommandType.DEBIT);
  };
}
