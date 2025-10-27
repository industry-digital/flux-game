import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { UseWorkbenchCommand, UseWorkbenchCommandArgs } from './types';
import { activateWorkbenchReducer } from './reducer';
import { useWorkbenchResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class USE_WORKBENCH implements PureHandlerInterface<TransformerContext, UseWorkbenchCommand> {
  resolve = useWorkbenchResolver;
  reduce = activateWorkbenchReducer;
  dependencies = [];
  handles = (command: Command): command is UseWorkbenchCommand => {
    return isCommandOfType<CommandType.WORKBENCH_USE, UseWorkbenchCommandArgs>(command, CommandType.WORKBENCH_USE);
  };
}
