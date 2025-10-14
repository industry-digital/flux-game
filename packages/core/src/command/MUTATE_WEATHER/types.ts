import { SystemCommand, CommandType } from '~/types/intent';
import { Weather } from '~/types/entity/weather';
import { PlaceURN } from '~/types/taxonomy';

export type MutateWeatherArgs = {
  placeId: PlaceURN;
  weather: Weather;
};

export type MutateWeatherCommand = SystemCommand<CommandType.MUTATE_WEATHER, MutateWeatherArgs>;
