import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { RetreatCommand, RetreatCommandArgs } from './types';
import { retreatReducer } from './reducer';
import { retreatResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class RETREAT implements PureHandlerInterface<TransformerContext, RetreatCommand> {
  type = CommandType.RETREAT;
  dependencies = [];
  reduce = retreatReducer;
  resolve = retreatResolver;
  handles = (command: Command): command is RetreatCommand => {
    return isCommandOfType<CommandType.RETREAT, RetreatCommandArgs>(command, CommandType.RETREAT);
  };
}
