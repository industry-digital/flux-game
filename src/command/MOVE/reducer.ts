import { CommandType, Transformer } from '~/types';
import { MoveCommandArgs } from '~/command/MOVE';
import { useActorMovement } from '~/lib/actor/movement';

/**
 * Reducer for MOVE commands
 * Uses the actor movement hook to process movement between places
 */
export const MoveCommandReducer: Transformer<CommandType.MOVE, MoveCommandArgs> = (context, command) => {
  const { move } = useActorMovement(context);
  const { direction } = command.args;

  move(direction);

  return context;
};
