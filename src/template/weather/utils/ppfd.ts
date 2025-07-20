import { Weather } from '~/types/entity/place';

/**
 * PPFD (Photosynthetic Photon Flux Density) calculation and light-based utilities
 * Based on atmospheric research and human perception thresholds
 */

/**
 * PPFD threshold categories based on meteorological research
 */
export const PPFD_THRESHOLDS = {
  PITCH_BLACK: 0,
  ALMOST_PITCH_BLACK: 50,
  VERY_DIM: 100,        // Deep twilight, heavy storm clouds
  DIM: 200,             // Heavily overcast day
  MODERATE: 500,        // Cloudy but bright day
  GOOD: 800,            // Light cloud cover
  BRIGHT: 1200,         // Partly sunny day
  VERY_BRIGHT: 1600,    // Clear sunny day
  BRILLIANT: 2000,      // Direct sunlight, crystal clear
  INTENSE: 2000,        // Tropical midday sun (max threshold)
} as const;

/**
 * Cloud cover thresholds based on WMO oktas system
 */
export const CLOUD_THRESHOLDS = {
  CLEAR: 10,           // 0-10% cloud cover
  SCATTERED: 50,       // 10-50% cloud cover
  BROKEN: 75,          // 50-75% cloud cover
  MOSTLY_CLOUDY: 90,   // 75-90% cloud cover
  OVERCAST: 100,       // 90-100% cloud cover
} as const;

/**
 * Precipitation intensity thresholds (mm/hour)
 */
export const PRECIPITATION_THRESHOLDS = {
  NONE: 0,
  LIGHT_DRIZZLE: 0.25,
  MODERATE_DRIZZLE: 0.5,
  HEAVY_DRIZZLE: 2.5,
  LIGHT_RAIN: 10,
  HEAVY_RAIN: 25,
  VERY_HEAVY_RAIN: 50,
  EXTREME_RAIN: 50,    // Threshold for extreme precipitation
} as const;

/**
 * Calculates the expected PPFD based on cloud cover and time of day
 * Used for detecting dramatic light changes
 */
export const calculateExpectedPPFD = (
  baselineMaxPPFD: number,
  cloudCover: number,
  solarElevation: number
): number => {
  // Cloud attenuation factor (0 = completely blocked, 1 = no attenuation)
  let cloudAttenuation = 1;

  if (cloudCover >= CLOUD_THRESHOLDS.OVERCAST) {
    cloudAttenuation = 0.1; // Heavy overcast blocks 90% of light
  } else if (cloudCover >= CLOUD_THRESHOLDS.MOSTLY_CLOUDY) {
    cloudAttenuation = 0.3; // Mostly cloudy blocks 70% of light
  } else if (cloudCover >= CLOUD_THRESHOLDS.BROKEN) {
    cloudAttenuation = 0.6; // Broken clouds block 40% of light
  } else if (cloudCover >= CLOUD_THRESHOLDS.SCATTERED) {
    cloudAttenuation = 0.8; // Scattered clouds block 20% of light
  }

  return baselineMaxPPFD * solarElevation * cloudAttenuation;
};

/**
 * Detects significant light changes between weather states
 */
export const detectLightChange = (
  previous: Weather,
  current: Weather
): 'brightening' | 'dimming' | 'stable' => {
  const ppfdDelta = current.ppfd - previous.ppfd;
  const ppfdChangePercent = Math.abs(ppfdDelta) / Math.max(previous.ppfd, 1);

  // Significant change threshold: 30% change or 200+ absolute change
  if (ppfdChangePercent > 0.3 || Math.abs(ppfdDelta) > 200) {
    return ppfdDelta > 0 ? 'brightening' : 'dimming';
  }

  return 'stable';
};

/**
 * Detects cloud cover changes that would affect lighting
 */
export const detectCloudChange = (
  previous: Weather,
  current: Weather
): 'clearing' | 'gathering' | 'stable' => {
  const cloudDelta = current.clouds - previous.clouds;

  // Significant cloud change threshold: 20% change
  if (Math.abs(cloudDelta) > 20) {
    return cloudDelta > 0 ? 'gathering' : 'clearing';
  }

  return 'stable';
};

/**
 * Determines if PPFD change is dramatic enough to warrant description
 */
export const isDramaticLightChange = (previous: Weather, current: Weather): boolean => {
  const ppfdDelta = Math.abs(current.ppfd - previous.ppfd);
  const ppfdChangePercent = ppfdDelta / Math.max(previous.ppfd, 1);

  // Dramatic change: 50%+ change or 400+ absolute change
  return ppfdChangePercent > 0.5 || ppfdDelta > 400;
};

/**
 * Gets the light quality descriptor based on PPFD value
 */
export const getLightQuality = (ppfd: number): string => {
  if (ppfd === PPFD_THRESHOLDS.PITCH_BLACK) {
    return 'pitch black';
  } else if (ppfd < PPFD_THRESHOLDS.ALMOST_PITCH_BLACK) {
    return 'almost pitch black';
  } else if (ppfd < PPFD_THRESHOLDS.VERY_DIM) {
    return 'very dim';
  } else if (ppfd < PPFD_THRESHOLDS.DIM) {
    return 'dim';
  } else if (ppfd < PPFD_THRESHOLDS.MODERATE) {
    return 'moderate';
  } else if (ppfd < PPFD_THRESHOLDS.GOOD) {
    return 'good';
  } else if (ppfd < PPFD_THRESHOLDS.BRIGHT) {
    return 'bright';
  } else if (ppfd < PPFD_THRESHOLDS.VERY_BRIGHT) {
    return 'very bright';
  } else if (ppfd < PPFD_THRESHOLDS.BRILLIANT) {
    return 'brilliant';
  } else {
    return 'intensely bright';
  }
};
