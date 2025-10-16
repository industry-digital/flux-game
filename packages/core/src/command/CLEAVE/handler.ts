import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { CleaveCommand, CleaveCommandArgs } from './types';
import { cleaveReducer } from './reducer';
import { cleaveResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class CLEAVE implements PureHandlerInterface<TransformerContext, CleaveCommand> {
  dependencies = [];
  reduce = cleaveReducer;
  resolve = cleaveResolver;
  handles = (command: Command): command is CleaveCommand => {
    return isCommandOfType<CommandType.CLEAVE, CleaveCommandArgs>(command, CommandType.CLEAVE);
  };
}
