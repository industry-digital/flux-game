import { Weather } from '~/types/entity/place';

/**
 * Weather data validation utilities
 * Ensures weather data is physically reasonable before processing
 */

/**
 * Validates that all weather properties are within reasonable ranges
 */
export const isValidWeather = (weather: Weather): boolean => {
  // Temperature check: -50°C to 60°C (extreme but possible terrestrial range)
  if (weather.temperature < -50 || weather.temperature > 60) {
    return false;
  }

  // Pressure check: 870-1085 hPa (covers extreme weather conditions)
  if (weather.pressure < 870 || weather.pressure > 1085) {
    return false;
  }

  // Humidity check: 0-100%
  if (weather.humidity < 0 || weather.humidity > 100) {
    return false;
  }

  // Precipitation check: 0-200 mm/hour (extreme rainfall upper bound)
  if (weather.precipitation < 0 || weather.precipitation > 200) {
    return false;
  }

  // PPFD check: 0-2500 μmol/m²/s (theoretical maximum for Earth)
  if (weather.ppfd < 0 || weather.ppfd > 2500) {
    return false;
  }

  // Cloud cover check: 0-100%
  if (weather.clouds < 0 || weather.clouds > 100) {
    return false;
  }

  // Fog check: 0-1 (normalized value)
  if (weather.fog < 0 || weather.fog > 1) {
    return false;
  }

  // Timestamp check: must be positive
  if (weather.ts <= 0) {
    return false;
  }

  return true;
};

/**
 * Checks if weather change is significant enough to warrant description
 */
export const isSignificantWeatherChange = (
  previous: Weather,
  current: Weather
): boolean => {
  // Temperature change >= 3°C (human-perceptible)
  if (Math.abs(current.temperature - previous.temperature) >= 3) {
    return true;
  }

  // Pressure change >= 5 hPa (weather-significant)
  if (Math.abs(current.pressure - previous.pressure) >= 5) {
    return true;
  }

  // Humidity change >= 15% (noticeable atmospheric change)
  if (Math.abs(current.humidity - previous.humidity) >= 15) {
    return true;
  }

  // Precipitation change >= 0.5 mm/hour (noticeable rain change)
  if (Math.abs(current.precipitation - previous.precipitation) >= 0.5) {
    return true;
  }

  // PPFD change >= 30% or 200 absolute units (noticeable light change)
  const ppfdDelta = Math.abs(current.ppfd - previous.ppfd);
  const ppfdChangePercent = ppfdDelta / Math.max(previous.ppfd, 1);
  if (ppfdChangePercent >= 0.3 || ppfdDelta >= 200) {
    return true;
  }

  // Cloud cover change >= 20% (noticeable sky change)
  if (Math.abs(current.clouds - previous.clouds) >= 20) {
    return true;
  }

  // Fog change >= 0.3 (significant visibility change)
  if (Math.abs(current.fog - previous.fog) >= 0.3) {
    return true;
  }

  return false;
};

/**
 * Determines the overall intensity/drama of a weather change (0-1 scale)
 */
export const calculateChangeIntensity = (
  previous: Weather,
  current: Weather
): number => {
  let intensity = 0;

  // Temperature contribution (normalized by extreme change threshold)
  const tempChange = Math.abs(current.temperature - previous.temperature);
  intensity += Math.min(tempChange / 10, 1) * 0.15; // 15% weight

  // Pressure contribution (normalized by significant change threshold)
  const pressureChange = Math.abs(current.pressure - previous.pressure);
  intensity += Math.min(pressureChange / 15, 1) * 0.1; // 10% weight

  // PPFD contribution (major visual impact)
  const ppfdChange = Math.abs(current.ppfd - previous.ppfd);
  const ppfdChangePercent = ppfdChange / Math.max(previous.ppfd, 1);
  intensity += Math.min(Math.max(ppfdChangePercent, ppfdChange / 500), 1) * 0.4; // 40% weight

  // Cloud cover contribution (visual and light impact)
  const cloudChange = Math.abs(current.clouds - previous.clouds);
  intensity += Math.min(cloudChange / 50, 1) * 0.2; // 20% weight

  // Precipitation contribution (immediate player impact)
  const precipChange = Math.abs(current.precipitation - previous.precipitation);
  intensity += Math.min(precipChange / 10, 1) * 0.1; // 10% weight

  // Fog contribution (visibility impact)
  const fogChange = Math.abs(current.fog - previous.fog);
  intensity += Math.min(fogChange / 0.5, 1) * 0.05; // 5% weight

  return Math.min(intensity, 1);
};
