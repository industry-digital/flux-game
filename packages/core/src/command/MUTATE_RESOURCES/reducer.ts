import { PureReducer, TransformerContext } from '~/types/handler';
import { MutateResourcesCommand } from './types';
import { EventType, ResourcesDidChangeInput } from '~/types/event';

/**
 * Change the `resources` in specific Place
 */
export const mutateResourcesReducer: PureReducer<TransformerContext, MutateResourcesCommand> = (context, command) => {
  const { declareEvent, declareError } = context;
  const { places } = context.world;
  const { placeId, resources } = command.args;

  const place = places[placeId];

  if (!place) {
    declareError(`Place ${placeId} not found`);
    return context;
  }

  const previous = place.resources;

  place.resources = resources;

  const event: ResourcesDidChangeInput = {
    type: EventType.RESOURCES_DID_CHANGE,
    trace: command.id,
    location: placeId,
    payload: {
      from:  previous,
      to: resources,
    },
  };

  declareEvent(event);

  return context;
};
