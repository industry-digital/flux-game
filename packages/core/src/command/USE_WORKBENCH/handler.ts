import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { UseWorkbenchCommand, UseWorkbenchCommandArgs } from './types';
import { useWorkbenchReducer } from './reducer';
import { useWorkbenchIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class USE_WORKBENCH implements PureHandlerInterface<TransformerContext, UseWorkbenchCommand> {
  parse = useWorkbenchIntentParser;
  reduce = useWorkbenchReducer;
  dependencies = [];
  handles = (command: Command): command is UseWorkbenchCommand => {
    return isCommandOfType<CommandType.USE_WORKBENCH, UseWorkbenchCommandArgs>(command, CommandType.USE_WORKBENCH);
  };
}
