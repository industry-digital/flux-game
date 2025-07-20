
/**
 * Solar geometry and time-based utility functions for weather descriptions
 */

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type TimeTransition = 'sunrise' | 'sunset' | 'deepening';

/**
 * Determines the time of day based on hour (simplified for game purposes)
 */
export const getTimeOfDay = (hour: number): TimeOfDay => {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
};

/**
 * Detects meaningful time transitions between weather states
 */
export const detectTimeTransition = (
  previousTs: number,
  currentTs: number
): TimeTransition | null => {
  const prevHour = new Date(previousTs).getUTCHours();
  const currHour = new Date(currentTs).getUTCHours();

  const prevTimeOfDay = getTimeOfDay(prevHour);
  const currTimeOfDay = getTimeOfDay(currHour);

  // Dawn transition (night/dawn -> day)
  if ((prevTimeOfDay === 'night' || prevTimeOfDay === 'dawn') && currTimeOfDay === 'day') {
    return 'sunrise';
  }

  // Dusk transition (day -> dusk/night)
  if (prevTimeOfDay === 'day' && (currTimeOfDay === 'dusk' || currTimeOfDay === 'night')) {
    return 'sunset';
  }

  // Deepening night transition (dusk -> night)
  if (prevTimeOfDay === 'dusk' && currTimeOfDay === 'night') {
    return 'deepening';
  }

  return null;
};

/**
 * Calculates expected solar elevation for basic day/night PPFD validation
 * Simplified model - in real implementation this would account for latitude/season
 */
export const getExpectedSolarElevation = (hour: number): number => {
  // Simplified sine wave: peak at noon (12), minimum at midnight (0/24)
  const hourAngle = (hour - 12) * (Math.PI / 12);
  return Math.max(0, Math.sin(Math.PI / 2 - Math.abs(hourAngle)));
};

/**
 * Validates that PPFD values are reasonable for the time of day
 */
export const validatePPFDForTime = (ppfd: number, timestamp: number): boolean => {
  const hour = new Date(timestamp).getUTCHours();
  const expectedSolarElevation = getExpectedSolarElevation(hour);

  // Night hours (22:00 - 05:00) should have very low PPFD
  if ((hour >= 22 || hour <= 5) && ppfd > 100) {
    return false;
  }

  // Bright daylight hours (10:00 - 14:00) should have substantial PPFD unless heavily clouded
  if (hour >= 10 && hour <= 14 && ppfd < 50) {
    return false; // Suspicious unless there's very heavy cloud cover
  }

  return true;
};

/**
 * Checks if we're in a meaningful transition window for solar events
 */
export const isInSolarTransitionWindow = (hour: number): boolean => {
  // Dawn transition window: 5:00-8:00
  if (hour >= 5 && hour <= 8) return true;
  // Dusk transition window: 17:00-21:00
  if (hour >= 17 && hour <= 21) return true;
  return false;
};
