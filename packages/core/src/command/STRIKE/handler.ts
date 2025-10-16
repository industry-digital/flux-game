import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { StrikeCommand, StrikeCommandArgs } from './types';
import { strikeReducer } from './reducer';
import { strikeResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class STRIKE implements PureHandlerInterface<TransformerContext, StrikeCommand> {
  dependencies = [];
  reduce = strikeReducer;
  resolve = strikeResolver;
  handles = (command: Command): command is StrikeCommand => {
    return isCommandOfType<CommandType.STRIKE, StrikeCommandArgs>(command, CommandType.STRIKE);
  };
}
