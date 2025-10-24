import { ErrorCode } from '~/types/error';
import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';

export const withBasicWorldStateValidation = <TCommand extends Command>(
  reducer: PureReducer<TransformerContext, TCommand>,
): PureReducer<TransformerContext, TCommand> => {
  return (context, command) => {
    const { world } = context;

    // Validate actor exists
    const actor = world.actors[command.actor];
    if (!actor) {
      context.declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    // Validate actor has a location
    if (!actor.location) {
      context.declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    // Validate actor's location exists in world
    if (!world.places[actor.location]) {
      context.declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    // Validate supplied session exists if the client provided it
    if (command.session) {
      const session = world.sessions[command.session];
      if (!session) {
        context.declareError(ErrorCode.INVALID_SESSION, command.id);
        return context;
      }
    }

    return reducer(context, command);
  };
};
