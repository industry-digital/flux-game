import { isCommandOfType } from '~/lib/intent';
import { Weather } from '~/types/schema/weather';
import {
  Command,
  CommandType,
  SystemCommand
} from '~/types/intent';
import {
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
} from '~/types/handler';
import { PlaceURN } from '~/types/taxonomy';
import { EventType } from '~/types/event';

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
  const { placeId } = command.args;
  const place = places[placeId];

  if (!place) {
    declareError(`Place ${placeId} not found`);
    return context;
  }

  const currentWeather: Weather | null = place.weather ?? null;
  const nextWeather = command.args.weather;

  place.weather = command.args.weather;

  declareEvent({
    type: EventType.WEATHER_DID_CHANGE,
    trace: command.id,
    location: placeId,
    payload: {
      from: currentWeather,
      to: nextWeather,
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
