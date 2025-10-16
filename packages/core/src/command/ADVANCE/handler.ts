import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { AdvanceCommand, AdvanceCommandArgs } from './types';
import { advanceReducer } from './reducer';
import { advanceResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class ADVANCE implements PureHandlerInterface<TransformerContext, AdvanceCommand> {
  dependencies = [];
  reduce = advanceReducer;
  resolve = advanceResolver;
  handles = (command: Command): command is AdvanceCommand => {
    return isCommandOfType<CommandType.ADVANCE, AdvanceCommandArgs>(command, CommandType.ADVANCE);
  };
}
