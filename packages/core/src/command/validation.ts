import { WellKnownActor } from '~/types/actor';
import { ErrorCode } from '~/types/error';
import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';

const WELL_KNOWN_ACTOR_URNS = new Set(Object.values(WellKnownActor));

export const withBasicWorldStateValidation = <TCommand extends Command>(
  reducer: PureReducer<TransformerContext, TCommand>,
): PureReducer<TransformerContext, TCommand> => {
  return (context, command) => {
    const { world, declareError } = context;

    // Skip validation for well-known actors (system commands)
    if (WELL_KNOWN_ACTOR_URNS.has(command.actor as WellKnownActor)) {
      return reducer(context, command);
    }

    // Validate actor exists
    const actor = world.actors[command.actor];
    if (!actor) {
      declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    // Validate actor has a location
    if (!actor.location) {
      declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    // Validate actor's location exists in world
    if (!world.places[actor.location]) {
      declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    // Validate supplied session exists if the client provided it
    if (command.session) {
      const session = world.sessions[command.session];
      if (!session) {
        declareError(ErrorCode.INVALID_SESSION, command.id);
        return context;
      }
    }

    return reducer(context, command);
  };
};
