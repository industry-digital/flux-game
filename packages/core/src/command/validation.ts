import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';

export const withBasicWorldStateValidation = <TCommand extends Command>(
  reducer: PureReducer<TransformerContext, TCommand>,
): PureReducer<TransformerContext, TCommand> => {
  return (context, command) => {
    const { world } = context;

    const declareError = (message: string) => {
      context.declareError(`\`${command.type}\`: ${message}`, command.id);
    };

    // Validate actor exists
    const actor = world.actors[command.actor];
    if (!actor) {
      declareError('Could not find actor in world projection');
      return context;
    }

    // Validate actor has a location
    if (!actor.location) {
      declareError('Actor must have a location');
      return context;
    }

    // Validate actor's location exists in world
    if (!world.places[actor.location]) {
      declareError('Could not find location in world projection');
      return context;
    }

    // Validate supplied session exists if the client provided it
    if (command.session) {
      const session = world.sessions[command.session];
      if (!session) {
        declareError('Could not find session in world projection');
        return context;
      }
    }

    return reducer(context, command);
  };
};
