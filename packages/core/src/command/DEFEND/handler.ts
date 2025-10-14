import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { DefendCommand, DefendCommandArgs } from './types';
import { defendReducer } from './reducer';
import { defendIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class DEFEND implements PureHandlerInterface<TransformerContext, DefendCommand> {
  dependencies = [];
  reduce = defendReducer;
  parse = defendIntentParser;
  handles = (command: Command): command is DefendCommand => {
    return isCommandOfType<CommandType.DEFEND, DefendCommandArgs>(command, CommandType.DEFEND);
  };
}
