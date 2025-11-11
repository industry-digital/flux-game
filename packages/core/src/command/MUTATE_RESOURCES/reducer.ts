import { PureReducer, TransformerContext } from '~/types/handler';
import { MutateResourcesCommand } from './types';
import { EventType } from '~/types/event';
import { WellKnownActor } from '~/types/actor';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { ErrorCode } from '~/types/error';

const reducerCore: PureReducer<TransformerContext, MutateResourcesCommand> = (context, command) => {
  const { declareEvent, declareError } = context;
  const { placeId, resources } = command.args;
  const place = context.world.places[placeId];

  if (!place) {
    declareError(ErrorCode.FAILED, command.id);
    return context;
  }

  const previous = place.resources;

  // Direct mutation of the place's resources
  place.resources = resources;

  declareEvent({
    type: EventType.RESOURCES_DID_CHANGE,
    trace: command.id,
    actor: WellKnownActor.SYSTEM,
    location: placeId,
    payload: {
      from:  previous,
      to: resources,
    },
  });

  return context;
};

/**
 * Change the `resources` in specific Place
 */
export const mutateResourcesReducer: PureReducer<TransformerContext, MutateResourcesCommand> =
  withCommandType(CommandType.MUTATE_RESOURCES,
    reducerCore,
  );
