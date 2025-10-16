import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { DebitCommand, DebitCommandArgs } from './types';
import { debitReducer } from './reducer';
import { debitIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class DEBIT implements PureHandlerInterface<TransformerContext, DebitCommand> {
  dependencies = [];
  reduce = debitReducer;
  parse = debitIntentParser;
  handles = (command: Command): command is DebitCommand => {
    return isCommandOfType<CommandType.DEBIT, DebitCommandArgs>(command, CommandType.DEBIT);
  };
}
