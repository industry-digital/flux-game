import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { DefendCommand, DefendCommandArgs } from './types';
import { defendReducer } from './reducer';
import { defendResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class DEFEND implements PureHandlerInterface<TransformerContext, DefendCommand> {
  type = CommandType.DEFEND;
  dependencies = [];
  reduce = defendReducer;
  resolve = defendResolver;
  handles = (command: Command): command is DefendCommand => {
    return isCommandOfType<CommandType.DEFEND, DefendCommandArgs>(command, CommandType.DEFEND);
  };
}
