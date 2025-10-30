import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { AddShellAttributeCommand, AddShellAttributeCommandArgs } from './types';
import { addShellAttributeReducer } from './reducer';
import { addShellAttributeResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class WORKBENCH_SHELL_ATTRIBUTE_ADD implements PureHandlerInterface<TransformerContext, AddShellAttributeCommand> {
  type = CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD;
  resolve = addShellAttributeResolver;
  reduce = addShellAttributeReducer;
  dependencies = [];
  handles = (command: Command): command is AddShellAttributeCommand => {
    return isCommandOfType<CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD, AddShellAttributeCommandArgs>(command, CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD);
  };
}
