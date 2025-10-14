import { PureReducer, TransformerContext } from '~/types/handler';
import { CreatePlaceCommand } from './types';
import { createPlace } from '~/worldkit/entity/place';
import { EventType } from '~/types';

export const createPlaceCommandReducer: PureReducer<TransformerContext, CreatePlaceCommand> = (
  context,
  command,
) => {
  const { declareEvent } = context;
  const { places } = context.world;
  const place = createPlace(command.args);

  // All we have to do is add the new place to `places`
  // The server will figure out the rest
  places[place.id] = place;

  declareEvent({
    type: EventType.PLACE_WAS_CREATED,
    location: place.id,
    payload: {},
    trace: command.id,
  });

  return context;
};
