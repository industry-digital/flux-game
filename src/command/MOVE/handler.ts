import { CommandHandlerInterface, CommandType, PureReducerContext, Command, AllowedInput } from '~/types/domain';
import { MoveCommandReducer } from './reducer';
import { MoveCommandArgs } from '~/command/MOVE';

/**
 * Handler for MOVE commands
 * Processes player movement between places
 */
export class MoveCommandHandler implements CommandHandlerInterface<
  PureReducerContext,
  CommandType.MOVE,
  MoveCommandArgs
> {
  reduce = MoveCommandReducer;
  dependencies = [];
  handles = (input: AllowedInput): input is Command<CommandType.MOVE, MoveCommandArgs> => {
    return 'type' in input && input.type === CommandType.MOVE;
  };
}
