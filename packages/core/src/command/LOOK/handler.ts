import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { LookCommand, LookCommandArgs } from './types';
import { lookReducer } from './reducer';
import { lookResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class LOOK implements PureHandlerInterface<TransformerContext, LookCommand> {
  type = CommandType.LOOK;
  reduce = lookReducer;
  resolve = lookResolver;
  dependencies = [];
  handles = (command: Command): command is LookCommand => {
    return isCommandOfType<CommandType.LOOK, LookCommandArgs>(command, CommandType.LOOK);
  };
}
