import { isCommandOfType } from '~/lib/intent';
import { Weather } from '~/types/entity/place';
import {
  Command,
  CommandType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  SystemCommand,
  PlaceURN,
  EventType,
} from '@flux';

export type MutateWeatherArgs = {
  placeId: PlaceURN;
  weather: Weather;
};

/**
 * Change the `weather` in specific Place
 */
export type MutateWeatherCommand = SystemCommand<CommandType.MUTATE_WEATHER, MutateWeatherArgs>;

export const mutateWeatherReducer: PureReducer<TransformerContext, MutateWeatherCommand> = (context, command) => {
  const { declareEvent, declareError } = context;
  const { places } = context.world;
  const { placeId, weather } = command.args;

  const place = places[placeId];

  if (!place) {
    declareError(`Place ${placeId} not found`);
    return context;
  }

  const next: Weather = weather;
  const previous: Weather | null = place.weather ?? null;

  place.weather = next;

  declareEvent({
    type: EventType.WEATHER_DID_CHANGE,
    trace: command.id,
    location: placeId,
    payload: {
      from: previous,
      to: next,
    },
  });

  return context;
};

export class MUTATE_WEATHER implements PureHandlerInterface<TransformerContext, MutateWeatherCommand> {
  reduce = mutateWeatherReducer;
  dependencies = [];
  handles =   (command: Command): command is MutateWeatherCommand => {
    return isCommandOfType<CommandType.MUTATE_WEATHER, MutateWeatherArgs>(command, CommandType.MUTATE_WEATHER);
  };
}
