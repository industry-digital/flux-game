import { Template } from '~/types/template';
import { Weather } from '~/types/entity/place';

export type DescribeWeatherProps = {
  previous?: Weather;
  current: Weather;
};

export const describeWeather: Template<DescribeWeatherProps> = (props) => {
  const enrichedPrevious: EnrichedWeather | null = props.previous ? { ...props.previous, date: new Date(props.previous.ts) } : null;
  const enrichedCurrent: EnrichedWeather = { ...props.current, date: new Date(props.current.ts) };

  const previousDescriptors = enrichedPrevious ? getAtmosphericDescriptors(enrichedPrevious) : {};
  const currentDescriptors = getAtmosphericDescriptors(enrichedCurrent);

  return '';
};

type EnrichedWeather = Weather & {
  date: Date;
};

export type AtmosphericDescriptor = keyof Omit<Weather, 'ts'>;

export const getAtmosphericDescriptors = (weather: EnrichedWeather): Record<AtmosphericDescriptor, string> => {
  return {
    temperature: describeTemperature(weather),
    pressure: describePressure(weather),
    humidity: describeHumidity(weather),
    precipitation: describePrecipitation(weather),
    ppfd: describePhotonFluxDensity(weather),
    clouds: describeClouds(weather),
  };
};

const describeTemperature = ({ temperature }: Weather): string => {
  if (temperature < -10) {
    return 'bitter, freezing';
  }

  if (temperature < 0) {
    return 'freezing';
  }

  if (temperature < 10) {
    return 'cold';
  }

  if (temperature < 20) {
    return 'cool';
  }
  if (temperature < 25) {
    return 'mild';
  }
  if (temperature < 30) {
    return 'warm';
  }

  if (temperature < 40) {
    return 'hot';
  }

  return 'unimaginably hot';
};

const describePressure = ({ pressure }: Weather): string => {
  if (pressure < 900) {
    return 'low pressure';
  }

  return 'normal pressure';
};

const describeHumidity = ({ humidity }: Weather): string => {
  if (humidity < 30) {
    return 'dry';
  }

  if (humidity < 60) {
    return 'humid';
  }

  return 'damp';
};

const describePrecipitation = ({ precipitation }: Weather): string => {
  if (precipitation < 0.1) {
    return 'light drizzle';
  }

  if (precipitation < 0.5) {
    return 'moderate drizzle';
  }

  if (precipitation < 1) {
    return 'light rain';
  }

  if (precipitation < 2) {
    return 'moderate rain';
  }

  if (precipitation < 5) {
    return 'heavy rain';
  }

  return 'torrential rain';
};

/**
 * Here we simply describe the amount of light that is being projected onto the ground.
 * PPFD is measured in photons per unit area per unit time.
 */
const describePhotonFluxDensity = ({ ppfd, date }: EnrichedWeather): string => {
  const isDaytime = date.getHours() >= 6 && date.getHours() < 18;

  if (ppfd === 0) {
    return 'It is pitch black. You cannot see a thing.';
  }

  if (ppfd < 50) {
    return 'It is almost pitch black. You can barely see a thing.';
  }

  if (ppfd < 100) {
    return 'The light is very dim, like deep twilight or heavy storm clouds.';
  }

  if (ppfd < 200) {
    return 'The light is dim, similar to a heavily overcast day.';
  }

  if (ppfd < 500) {
    return 'The light is moderate, like a cloudy but bright day.';
  }

  if (ppfd < 800) {
    return 'The light is good, similar to light cloud cover.';
  }

  if (ppfd < 1200) {
    return 'The light is bright, like a partly sunny day.';
  }

  if (ppfd < 1600) {
    return 'The light is very bright, like a clear sunny day.';
  }

  if (ppfd < 2000) {
    return 'The light is brilliant, like direct sunlight on a crystal clear day.';
  }

  return 'The light is intensely bright, like tropical midday sun.';
};

export const describeClouds = ({ clouds }: Weather): string => {
  if (clouds < 0.1) {
    return 'clear skies';
  }

  if (clouds < 0.3) {
    return 'light clouds';
  }

  return 'overcast';
};
