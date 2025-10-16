import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { DoneCommand, DoneCommandArgs } from './types';
import { doneReducer } from './reducer';
import { doneIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class DONE implements PureHandlerInterface<TransformerContext, DoneCommand> {
  dependencies = [];
  reduce = doneReducer;
  parse = doneIntentParser;
  handles = (command: Command): command is DoneCommand => {
    return isCommandOfType<CommandType.DONE, DoneCommandArgs>(command, CommandType.DONE);
  };
}
