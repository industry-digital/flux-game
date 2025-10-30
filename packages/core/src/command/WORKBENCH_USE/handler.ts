import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { UseWorkbenchCommand, UseWorkbenchCommandArgs } from './types';
import { activateWorkbenchReducer } from './reducer';
import { activateWorkbenchResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class WORKBENCH_USE implements PureHandlerInterface<TransformerContext, UseWorkbenchCommand> {
  type = CommandType.WORKBENCH_USE;
  resolve = activateWorkbenchResolver;
  reduce = activateWorkbenchReducer;
  dependencies = [];
  handles = (command: Command): command is UseWorkbenchCommand => {
    return isCommandOfType<CommandType.WORKBENCH_USE, UseWorkbenchCommandArgs>(command, CommandType.WORKBENCH_USE);
  };
}
