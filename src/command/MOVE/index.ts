import { MoveCommandReducer } from './reducer';
import {
  CommandType,
  Command,
  isCommandOfType,
  TransformerInterface,
  Taxonomy,
} from '~/types';

export type MoveCommandArgs = {
  direction: Taxonomy.Directions;
};

export type MoveCommand = Command<CommandType.MOVE, MoveCommandArgs>;

/**
 * Handler for MOVE commands
 * Processes an actor's movement in the world
 */
export class MOVE implements TransformerInterface<
  Command<CommandType.MOVE, MoveCommandArgs>
> {
  reduce = MoveCommandReducer;
  dependencies = [];
  handles = (input: Command): input is Command<CommandType.MOVE, MoveCommandArgs> => {
    return isCommandOfType(input, CommandType.MOVE);
  };
}
