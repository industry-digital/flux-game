import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { TargetCommand, TargetCommandArgs } from './types';
import { targetReducer } from './reducer';
import { targetIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class TARGET implements PureHandlerInterface<TransformerContext, TargetCommand> {
  dependencies = [];
  reduce = targetReducer;
  parse = targetIntentParser;
  handles = (command: Command): command is TargetCommand => {
    return isCommandOfType<CommandType.TARGET, TargetCommandArgs>(command, CommandType.TARGET);
  };
}
