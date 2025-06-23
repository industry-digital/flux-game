import { createPlace } from '~/worldkit/entity/place';
import { EventType, PlaceInput } from '~/types';
import { isCommandOfType } from '~/lib/intent';
import {
    CommandType,
    PureReducer,
    TransformerContext,
    PureHandlerInterface,
    AllowedInput,
} from '@flux';
import { SystemCommand } from '~/types/intent';

export type CreatePlaceCommand = SystemCommand<CommandType.CREATE_PLACE, PlaceInput>;

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

export class CREATE_PLACE implements PureHandlerInterface<TransformerContext, CreatePlaceCommand> {
  reduce = createPlaceCommandReducer;
  dependencies = [];
  handles = (input: AllowedInput): input is CreatePlaceCommand => {
    return isCommandOfType<CommandType.CREATE_PLACE, PlaceInput>(input, CommandType.CREATE_PLACE);
  };
};
