import { PureReducer, TransformerContext } from '~/types/handler';
import { MutateWeatherCommand } from './types';
import { Weather } from '~/types/entity/weather';
import { EventType } from '~/types/event';
import { WellKnownActor } from '~/types/actor';

/**
 * Change the `weather` in specific Place
 */
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
    trace: command.id,
    type: EventType.WEATHER_DID_CHANGE,
    actor: WellKnownActor.SYSTEM,
    location: placeId,
    payload: {
      from: currentWeather,
      to: nextWeather,
    },
  });

  return context;
};
