import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { ActorURN, PlaceURN } from '~/types/taxonomy';

export const withBasicWorldStateValidation = <TCommand extends Command>(
  reducer: PureReducer<TransformerContext, TCommand>,
): PureReducer<TransformerContext, TCommand> => {
  return (context, command) => {
    const { actors, places } = context.world;

    // Validate actor exists
    const actor = actors[command.actor as ActorURN];
    if (!actor) {
      context.declareError(`Could not find \`${command.type}\` actor in world projection`, command.id);
      return context;
    }

    // Validate actor has a location
    if (!actor.location) {
      context.declareError(`\`${command.type}\` actor must have a location`, command.id);
      return context;
    }

    // Validate actor's location exists in world
    if (!places[actor.location as PlaceURN]) {
      context.declareError(`Could not find \`${command.type}\` location in world projection`, command.id);
      return context;
    }

    return reducer(context, command);
  };
};
