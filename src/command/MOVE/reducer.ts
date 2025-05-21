import { Command, CommandType, PureReducer, PureReducerContext } from '~/types/domain';
import { useActorMovement } from '~/lib/actor/movement';
import { MoveCommandArgs } from '~/command/MOVE';

/**
 * Reducer for MOVE commands
 * Uses the actor movement hook to process movement between places
 */
export const MoveCommandReducer: PureReducer<
  PureReducerContext,
  Command<CommandType.MOVE,
  MoveCommandArgs>
> = (context, command) => {
  const { move } = useActorMovement(context);
  const { direction } = command.args;
  const { success, reason } = move(direction);

  // Could handle results here if needed
  // if (!success) {
  //   context.declareError(new Error(reason));
  // }

  return context;
};
