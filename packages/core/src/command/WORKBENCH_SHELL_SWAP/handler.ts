import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { SwapShellCommand, SwapShellCommandArgs } from './types';
import { swapShellReducer } from './reducer';
import { swapShellResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class SWAP_SHELL implements PureHandlerInterface<TransformerContext, SwapShellCommand> {
  resolve = swapShellResolver;
  reduce = swapShellReducer;
  dependencies = [];
  handles = (command: Command): command is SwapShellCommand => {
    return isCommandOfType<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>(command, CommandType.WORKBENCH_SHELL_SWAP);
  };
}
