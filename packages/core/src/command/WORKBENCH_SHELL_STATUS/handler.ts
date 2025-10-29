import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { AssessShellStatusCommand, AssessShellStatusCommandArgs } from './types';
import { shellStatusReducer } from './reducer';
import { shellStatusResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class WORKBENCH_SHELL_STATUS implements PureHandlerInterface<TransformerContext, AssessShellStatusCommand> {
  resolve = shellStatusResolver;
  reduce = shellStatusReducer;
  dependencies = [];
  handles = (command: Command): command is AssessShellStatusCommand => {
    return isCommandOfType<CommandType.WORKBENCH_SHELL_STATUS, AssessShellStatusCommandArgs>(command, CommandType.WORKBENCH_SHELL_STATUS);
  };
}
