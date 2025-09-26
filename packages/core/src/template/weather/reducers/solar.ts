import { WeatherReducer } from '../types';
import { getTimeOfDay } from '../utils/time';

/**
 * Solar geometry reducer - handles sunrise, sunset, and solar-based lighting descriptions
 * Pure function that processes solar transitions and time-of-day changes
 */
export const applySolarGeometry: WeatherReducer = (context, current) => {
  const currentHour = new Date(current.ts).getUTCHours();
  const previousHour = new Date(context.previous.ts).getUTCHours();

  const currentTimeOfDay = getTimeOfDay(currentHour);
  const previousTimeOfDay = getTimeOfDay(previousHour);

  // Update basic time of day descriptor
  const updatedContext = {
    ...context,
    descriptors: {
      ...context.descriptors,
      timeOfDay: currentTimeOfDay,
    },
  };

  // No transition occurred
  if (currentTimeOfDay === previousTimeOfDay) {
    return updatedContext;
  }

  context.debug?.(`Solar transition detected: ${previousTimeOfDay} -> ${currentTimeOfDay}`);

  // Handle specific transitions
  if (previousTimeOfDay === 'night' && currentTimeOfDay === 'dawn') {
    return handleDawnTransition(updatedContext, current);
  }

  if (previousTimeOfDay === 'dawn' && currentTimeOfDay === 'day') {
    return handleSunriseTransition(updatedContext, current);
  }

  if (previousTimeOfDay === 'day' && currentTimeOfDay === 'dusk') {
    return handleSunsetTransition(updatedContext, current);
  }

  if (previousTimeOfDay === 'dusk' && currentTimeOfDay === 'night') {
    return handleNightDeepening(updatedContext, current);
  }

  return updatedContext;
};

/**
 * Handles the transition from night to dawn (first light)
 */
const handleDawnTransition = (context: any, current: any) => {
  const cloudCover = current.clouds;
  const intensity = Math.max(0.5, 1 - cloudCover / 100); // Less dramatic if cloudy

  let dawnDescription: string;

  if (cloudCover > 80) {
    dawnDescription = 'A faint gray light seeps through heavy overcast, signaling the reluctant arrival of dawn';
  } else if (cloudCover > 50) {
    dawnDescription = 'Dawn\'s first light filters through scattered clouds, gradually illuminating the landscape';
  } else if (cloudCover > 20) {
    dawnDescription = 'The eastern sky begins to glow with the soft promise of dawn';
  } else {
    dawnDescription = 'Dawn breaks across the horizon, painting the sky in delicate pastels';
  }

  // Add atmospheric variation with random factor
  if (context.random && context.random() > 0.7) {
    if (current.humidity > 80) {
      dawnDescription += ', and a gentle mist hangs in the air';
    } else if (current.temperature < 5) {
      dawnDescription += ', crisp and clear in the cold morning air';
    }
  }

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      timeTransition: 'sunrise',
    },
    narrative: [...context.narrative, dawnDescription],
    intensity: Math.max(context.intensity, intensity),
  };
};

/**
 * Handles the transition from dawn to day (sunrise proper)
 */
const handleSunriseTransition = (context: any, current: any) => {
  const cloudCover = current.clouds;
  const ppfd = current.ppfd;

  let sunriseDescription: string;

  if (cloudCover > 70) {
    sunriseDescription = 'The sun climbs higher behind a veil of clouds, casting a diffuse gray light';
  } else if (cloudCover > 40) {
    sunriseDescription = 'Sunlight breaks through gaps in the clouds, creating shifting patterns of light and shadow';
  } else if (ppfd > 1000) {
    sunriseDescription = 'Brilliant sunlight floods the landscape as the sun climbs above the horizon';
  } else {
    sunriseDescription = 'The sun rises, bringing warm golden light to the awakening world';
  }

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      timeTransition: 'sunrise',
    },
    narrative: [...context.narrative, sunriseDescription],
    intensity: Math.max(context.intensity, 0.6),
  };
};

/**
 * Handles the transition from day to dusk (sunset beginning)
 */
const handleSunsetTransition = (context: any, current: any) => {
  const cloudCover = current.clouds;
  const intensity = Math.max(0.5, 1 - cloudCover / 100);

  let sunsetDescription: string;

  if (cloudCover > 80) {
    sunsetDescription = 'The light grows dim and gray as the sun sinks behind heavy clouds';
  } else if (cloudCover > 50) {
    sunsetDescription = 'The setting sun paints the scattered clouds in shades of amber and rose';
  } else if (cloudCover > 20) {
    sunsetDescription = 'The sun begins its descent, casting long golden rays across the land';
  } else {
    sunsetDescription = 'The sun sinks toward the horizon, bathing everything in honey-colored light';
  }

  // Golden hour enhancement for clear conditions
  if (cloudCover < 30 && current.ppfd > 800 && context.random && context.random() > 0.6) {
    sunsetDescription += ', creating the magical glow of golden hour';
  }

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      timeTransition: 'sunset',
    },
    narrative: [...context.narrative, sunsetDescription],
    intensity: Math.max(context.intensity, intensity),
  };
};

/**
 * Handles the transition from dusk to night (darkness falling)
 */
const handleNightDeepening = (context: any, current: any) => {
  const cloudCover = current.clouds;

  let nightDescription: string;

  if (cloudCover > 70) {
    nightDescription = 'Darkness settles over the land like a heavy blanket of clouds';
  } else if (current.fog > 0.5) {
    nightDescription = 'Night falls, and a thick fog begins to cloak the landscape in mystery';
  } else if (current.ppfd < 10) {
    nightDescription = 'True darkness embraces the world as the last traces of twilight fade';
  } else {
    nightDescription = 'Twilight deepens into the quiet darkness of night';
  }

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      timeTransition: 'deepening',
    },
    narrative: [...context.narrative, nightDescription],
    intensity: Math.max(context.intensity, 0.4),
  };
};
