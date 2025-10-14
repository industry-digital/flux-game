import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { MoveCommand } from './types';
import { actorMovementReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

/**
 * Handler for MOVE commands
 * Processes an actor's movement in the world
 */
export class MOVE implements PureHandlerInterface<TransformerContext, MoveCommand> {
  reduce = actorMovementReducer;
  dependencies = [];
  handles = (input: Command): input is MoveCommand => {
    return isCommandOfType(input, CommandType.MOVE);
  };
}
