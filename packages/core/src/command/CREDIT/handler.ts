import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { CreditCommand, CreditCommandArgs } from './types';
import { creditReducer } from './reducer';
import { creditIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class CREDIT implements PureHandlerInterface<TransformerContext, CreditCommand> {
  dependencies = [];
  reduce = creditReducer;
  parse = creditIntentParser;
  handles = (command: Command): command is CreditCommand => {
    return isCommandOfType<CommandType.CREDIT, CreditCommandArgs>(command, CommandType.CREDIT);
  };
}
