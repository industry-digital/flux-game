import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { ListShellsCommand, ListShellsCommandArgs } from './types';
import { listShellsReducer } from './reducer';
import { listShellsResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class LIST_SHELLS implements PureHandlerInterface<TransformerContext, ListShellsCommand> {
  resolve = listShellsResolver;
  reduce = listShellsReducer;
  dependencies = [];
  handles = (command: Command): command is ListShellsCommand => {
    return isCommandOfType<CommandType.WORKBENCH_SHELL_LIST, ListShellsCommandArgs>(command, CommandType.WORKBENCH_SHELL_LIST);
  };
}
