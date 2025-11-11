import { PureReducer, TransformerContext } from '~/types/handler';
import { CreatePlaceCommand } from './types';
import { createPlace } from '~/worldkit/entity/place';
import { EventType } from '~/types/event';
import { WellKnownActor } from '~/types/actor';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, CreatePlaceCommand> = (context, command) => {
  const place = createPlace(command.args);
  context.world.places[place.id] = place;

  context.declareEvent({
    trace: command.id,
    type: EventType.PLACE_WAS_CREATED,
    location: place.id,
    actor: WellKnownActor.SYSTEM,
    payload: {
      newPlaceId: place.id,
    },
  });

  return context;
};

export const createPlaceCommandReducer: PureReducer<TransformerContext, CreatePlaceCommand> =
  withCommandType(CommandType.CREATE_PLACE,
    reducerCore,
  );
