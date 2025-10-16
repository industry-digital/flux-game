import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { CreditCommand, CreditCommandArgs } from './types';
import { creditReducer } from './reducer';
import { creditResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class CREDIT implements PureHandlerInterface<TransformerContext, CreditCommand> {
  dependencies = [];
  reduce = creditReducer;
  resolve = creditResolver;
  handles = (command: Command): command is CreditCommand => {
    return isCommandOfType<CommandType.CREDIT, CreditCommandArgs>(command, CommandType.CREDIT);
  };
}
