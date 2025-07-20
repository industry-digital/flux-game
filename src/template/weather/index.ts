import { Template } from '~/types/template';
import { Weather } from '~/types/entity/place';
import { PotentiallyImpureOperations } from '~/types/handler';
import { WeatherReducer, WeatherReducerContext } from './types';
import { isValidWeather, isValidWeatherTransition, isSignificantWeatherChange } from './utils/validation';
import { getTimeOfDay } from './utils/time';
import { BASE62_CHARSET, uniqid } from '~/lib/random';

// Import all reducers
import { applySolarGeometry } from './reducers/solar';
import { applyCloudCover } from './reducers/clouds';
import { applyPrecipitation } from './reducers/precipitation';
import { applyFog } from './reducers/fog';
import { enhanceNarrative } from './reducers/narrative';
import { renderFinalDescription, extractFinalDescription } from './reducers/final';

export type DescribeWeatherChangeProps = PotentiallyImpureOperations & {
  previous?: Weather;
  current: Weather;
};

/**
 * Main weather description function using the reducer pipeline architecture
 * Generates human-readable descriptions of meaningful atmospheric transitions
 */
export const describeWeatherChange: Template<DescribeWeatherChangeProps> = (props) => {
  // Early validation and exit conditions
  if (!props.previous) {
    return ''; // No previous state to compare against
  }

  if (!isValidWeather(props.current) || !isValidWeather(props.previous)) {
    props.debug?.('Invalid weather data provided');
    return ''; // Invalid weather data
  }

  if (!isValidWeatherTransition(props.previous, props.current)) {
    props.debug?.('Invalid weather transition detected');
    return ''; // Unrealistic transition
  }

  if (!isSignificantWeatherChange(props.previous, props.current)) {
    props.debug?.('Weather change not significant enough to warrant description');
    return ''; // No significant change
  }

  // Create the reducer pipeline context
  const context = createInitialContext(props);

  props.debug?.('Starting weather description pipeline');

  // Execute the reducer pipeline
  const finalContext = executeReducerPipeline(context, props.current);

  // Extract and return the final description
  const description = extractFinalDescription(finalContext);
  props.debug?.(`Weather description generated: "${description}"`);

  return description;
};

// WeatherReducerContext is imported from ./types

/**
 * Creates the initial context for the reducer pipeline
 */
const createInitialContext = (props: DescribeWeatherChangeProps): WeatherReducerContext => {
  const currentHour = new Date(props.current.ts).getUTCHours();

  return {
    // Spread in all injected impure operations
    random: props.random || (() => Math.random()),
    timestamp: props.timestamp || (() => Date.now()),
    uniqid: () => uniqid(8, BASE62_CHARSET),
    debug: props.debug || (() => {}),

    // Weather context
    previous: props.previous!,

    // Initial weather description state
    narrative: [] as string[],
    descriptors: {
      timeOfDay: getTimeOfDay(currentHour) as 'dawn' | 'day' | 'dusk' | 'night',
      mood: 'neutral' as const,
    },
    intensity: 0,
  };
};

/**
 * Executes the complete reducer pipeline in sequence
 * Each reducer processes atmospheric phenomena and builds narrative
 */
const executeReducerPipeline = (initialContext: WeatherReducerContext, current: Weather): WeatherReducerContext => {
  const reducers: WeatherReducer[] = [
    applySolarGeometry,      // Handle sun position, sunrise/sunset
    applyCloudCover,         // Handle cloud formation/clearing
    applyPrecipitation,      // Handle rain/weather events
    applyFog,                // Handle fog formation/dissipation
    enhanceNarrative,        // Merge related phenomena into elegant descriptions
    renderFinalDescription,  // Format final output
  ];

  // Execute reducers in sequence, each building on the previous context
  return reducers.reduce(
    (context, reducer) => {
      try {
        return reducer(context, current);
      } catch (error) {
        context.debug?.(`Reducer error: ${error}`);
        return context; // Continue with previous context on error
      }
    },
    initialContext
  );
};
