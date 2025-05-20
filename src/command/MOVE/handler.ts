import { Command, CommandType, PureHandlerInterface, PureReducerContext } from '~/types/domain';
import { MoveCommandReducer, ExpectedWorldState } from './reducer';

export class MoveCommandHandler
  implements PureHandlerInterface<Command<CommandType.MOVE>, PureReducerContext<ExpectedWorldState>> {

  dependencies = [];
  reduce = MoveCommandReducer;
  handles = (command: Command): command is Command<CommandType.MOVE> => {
    return command.type === CommandType.MOVE;
  };
}
