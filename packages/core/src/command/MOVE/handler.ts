import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { MoveCommand } from './types';
import { actorMovementReducer } from './reducer';
import { CommandType } from '~/types/intent';

/**
 * Handler for MOVE commands
 * Processes an actor's movement in the world
 * TODO: Implement resolver
 */
export class MOVE implements PureHandlerInterface<TransformerContext, MoveCommand> {
  type = CommandType.MOVE;
  reduce = actorMovementReducer;
  dependencies = [];
}
