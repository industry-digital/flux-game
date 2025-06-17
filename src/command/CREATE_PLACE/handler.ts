import { createPlace } from '~/worldkit/entity/place';
import { PlaceInput } from '~/types';
import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  EventType,
} from '@flux';
import { SystemCommand } from '~/types/intent';

export type CreatePlaceCommand = SystemCommand<CommandType.CREATE_PLACE, PlaceInput>;

export const createPlaceCommandReducer: PureReducer<TransformerContext, CreatePlaceCommand> = (
  context,
  command,
) => {
  const { places } = context.world;
  const place = createPlace(command.args);

  places[place.id] = place;

  context.declareEvent({
    type: EventType.PLACE_CREATION_DID_SUCCEED,
    payload: { placeId: place.id },
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
