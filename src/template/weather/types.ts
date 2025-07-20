import { Weather } from '~/types/entity/place';
import { PotentiallyImpureOperations } from '~/types/handler';

/**
 * Accumulator type for the reducer pipeline
 * Builds up complete sentences describing atmospheric phenomena
 */
export type WeatherDescription = {
  narrative: string[];           // Complete sentences, joined with periods
  descriptors: {
    timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
    timeTransition?: 'sunrise' | 'sunset' | 'deepening';
    cloudChange?: 'clearing' | 'gathering' | 'stable';
    lightChange?: 'brightening' | 'dimming' | 'stable';
    precipitationChange?: 'starting' | 'intensifying' | 'lessening' | 'stopping' | 'stable';
    mood: 'peaceful' | 'dramatic' | 'ominous' | 'neutral';
  };
  intensity: number;             // 0-1, how dramatic the change is
};

type WeatherReducerContext = PotentiallyImpureOperations & WeatherDescription & {
  previous: Weather;
}


/**
 * Pure function that transforms weather description state
 * Each reducer models a specific physical phenomenon
 * Uses injected impurity via PotentiallyImpureOperations for random, debug, etc.
 */
export type WeatherReducer = (
  context: WeatherReducerContext,
  current: Weather,
) => WeatherReducerContext;
