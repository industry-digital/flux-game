import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { RenameShellCommand, RenameShellCommandArgs } from './types';
import { renameShellReducer } from './reducer';
import { renameShellResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class WORKBENCH_SHELL_RENAME implements PureHandlerInterface<TransformerContext, RenameShellCommand> {
  resolve = renameShellResolver;
  reduce = renameShellReducer;
  dependencies = [];
  handles = (command: Command): command is RenameShellCommand => {
    return isCommandOfType<CommandType.WORKBENCH_SHELL_RENAME, RenameShellCommandArgs>(command, CommandType.WORKBENCH_SHELL_RENAME);
  };
}
