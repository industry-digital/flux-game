import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { LookCommand, LookCommandArgs } from './types';
import { lookReducer } from './reducer';
import { lookIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class LOOK implements PureHandlerInterface<TransformerContext, LookCommand> {
  reduce = lookReducer;
  parse = lookIntentParser;
  dependencies = [];
  handles = (command: Command): command is LookCommand => {
    return isCommandOfType<CommandType.LOOK, LookCommandArgs>(command, CommandType.LOOK);
  };
}
