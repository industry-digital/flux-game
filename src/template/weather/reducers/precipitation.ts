import { WeatherReducer } from '../types';
import { PRECIPITATION_THRESHOLDS } from '../utils/ppfd';

/**
 * Precipitation reducer - handles rain/weather events starting, stopping, and intensity changes
 * Pure function that processes precipitation transitions with rich atmospheric descriptions
 */
export const applyPrecipitation: WeatherReducer = (context, current) => {
  const precipDelta = current.precipitation - context.previous.precipitation;
  const precipChange = Math.abs(precipDelta);

  // Must be significant change to warrant description
  if (precipChange < 0.5) {
    return context;
  }

  context.debug?.(`Precipitation transition detected: ${context.previous.precipitation} -> ${current.precipitation} mm/h`);

  // Determine transition type
  if (context.previous.precipitation < PRECIPITATION_THRESHOLDS.LIGHT_DRIZZLE &&
      current.precipitation >= PRECIPITATION_THRESHOLDS.LIGHT_DRIZZLE) {
    return handlePrecipitationStarting(context, current);
  }

  if (context.previous.precipitation >= PRECIPITATION_THRESHOLDS.LIGHT_DRIZZLE &&
      current.precipitation < PRECIPITATION_THRESHOLDS.LIGHT_DRIZZLE) {
    return handlePrecipitationStopping(context, current);
  }

  if (precipDelta > 2) {
    return handlePrecipitationIntensifying(context, current);
  }

  if (precipDelta < -2) {
    return handlePrecipitationLessening(context, current);
  }

  return context;
};

/**
 * Handles precipitation beginning
 */
const handlePrecipitationStarting = (context: any, current: any) => {
  const precipIntensity = current.precipitation;
  const cloudCover = current.clouds;
  const temperature = current.temperature;

  let precipDescription: string;

  // Heavy rain starting
  if (precipIntensity >= PRECIPITATION_THRESHOLDS.HEAVY_RAIN) {
    if (cloudCover > 80) {
      precipDescription = 'Heavy rain suddenly begins to fall from the dark storm clouds above';
    } else {
      precipDescription = 'A sudden downpour begins, fat raindrops drumming loudly against the ground';
    }
  }
  // Moderate rain starting
  else if (precipIntensity >= PRECIPITATION_THRESHOLDS.LIGHT_RAIN) {
    if (temperature < 5) {
      precipDescription = 'Cold rain begins to fall, each drop sharp and biting';
    } else if (cloudCover > 70) {
      precipDescription = 'Rain starts to fall steadily from the gray overcast above';
    } else {
      precipDescription = 'The first drops of rain begin to fall, pattering gently against leaves and earth';
    }
  }
  // Light rain/drizzle starting
  else if (precipIntensity >= PRECIPITATION_THRESHOLDS.MODERATE_DRIZZLE) {
    if (current.fog > 0.3) {
      precipDescription = 'A fine drizzle begins to fall through the misty air';
    } else {
      precipDescription = 'A gentle drizzle starts, barely more than mist condensing from the gray sky';
    }
  }
  // Very light drizzle
  else {
    precipDescription = 'The faintest hint of moisture begins to fall, more felt than seen';
  }

  // Add atmospheric context
  if (context.random && context.random() > 0.7) {
    if (current.humidity > 85) {
      precipDescription += ', adding to the already thick and humid air';
    } else if (current.pressure < 1000) {
      precipDescription += ', carried by the unsettled atmospheric conditions';
    }
  }

  const intensity = Math.min(precipIntensity / 10, 1);

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      precipitationChange: 'starting',
    },
    narrative: [...context.narrative, precipDescription],
    intensity: Math.max(context.intensity, intensity),
  };
};

/**
 * Handles precipitation stopping
 */
const handlePrecipitationStopping = (context: any, current: any) => {
  const previousIntensity = context.previous.precipitation;
  const cloudCover = current.clouds;

  let precipDescription: string;

  // Heavy rain stopping
  if (previousIntensity >= PRECIPITATION_THRESHOLDS.HEAVY_RAIN) {
    if (cloudCover < 40) {
      precipDescription = 'The heavy rain ceases as suddenly as it begins, and patches of blue sky appear through the breaking clouds';
    } else {
      precipDescription = 'The torrential downpour finally comes to an end, leaving only the sound of water dripping from saturated surfaces';
    }
  }
  // Moderate rain stopping
  else if (previousIntensity >= PRECIPITATION_THRESHOLDS.LIGHT_RAIN) {
    if (cloudCover < 50) {
      precipDescription = 'The rain tapers off and stops, leaving the air fresh and clean';
    } else {
      precipDescription = 'The steady rainfall comes to a gradual end, though the clouds remain overhead';
    }
  }
  // Light rain/drizzle stopping
  else {
    if (current.fog > 0.3) {
      precipDescription = 'The drizzle fades away, leaving only a gentle mist hanging in the air';
    } else {
      precipDescription = 'The last drops of drizzle fall, and the gentle precipitation comes to an end';
    }
  }

  // Add post-rain atmospheric effects
  if (context.random && context.random() > 0.6) {
    if (current.humidity > 80 && current.temperature > 15) {
      precipDescription += ', and a fresh, earthy scent rises from the wet ground';
    } else if (current.ppfd > 800) {
      precipDescription += ', and steam begins to rise from sun-warmed puddles';
    }
  }

  const intensity = Math.min(previousIntensity / 10, 1);

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      precipitationChange: 'stopping',
    },
    narrative: [...context.narrative, precipDescription],
    intensity: Math.max(context.intensity, intensity * 0.8), // Stopping is slightly less dramatic
  };
};

/**
 * Handles precipitation intensifying
 */
const handlePrecipitationIntensifying = (context: any, current: any) => {
  const precipDelta = current.precipitation - context.previous.precipitation;
  const finalIntensity = current.precipitation;

  let precipDescription: string;

  if (finalIntensity >= PRECIPITATION_THRESHOLDS.VERY_HEAVY_RAIN) {
    precipDescription = 'The rain intensifies to a torrential downpour, hammering the ground with overwhelming force';
  } else if (finalIntensity >= PRECIPITATION_THRESHOLDS.HEAVY_RAIN) {
    precipDescription = 'The rainfall becomes heavy and driving, drumming loudly against all surfaces';
  } else if (finalIntensity >= PRECIPITATION_THRESHOLDS.LIGHT_RAIN) {
    precipDescription = 'The gentle rain strengthens to a steady, persistent fall';
  } else {
    precipDescription = 'The drizzle grows heavier, becoming more substantial';
  }

  const intensity = Math.min(precipDelta / 15, 1);

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      precipitationChange: 'intensifying',
    },
    narrative: [...context.narrative, precipDescription],
    intensity: Math.max(context.intensity, intensity),
  };
};

/**
 * Handles precipitation lessening/weakening
 */
const handlePrecipitationLessening = (context: any, current: any) => {
  const precipDelta = Math.abs(current.precipitation - context.previous.precipitation);
  const finalIntensity = current.precipitation;

  let precipDescription: string;

  if (context.previous.precipitation >= PRECIPITATION_THRESHOLDS.VERY_HEAVY_RAIN) {
    precipDescription = 'The torrential rain begins to ease, reducing to a more manageable intensity';
  } else if (context.previous.precipitation >= PRECIPITATION_THRESHOLDS.HEAVY_RAIN) {
    precipDescription = 'The heavy rain lessens to a gentler, steadier fall';
  } else if (finalIntensity >= PRECIPITATION_THRESHOLDS.MODERATE_DRIZZLE) {
    precipDescription = 'The rain softens to a light, pattering drizzle';
  } else {
    precipDescription = 'The precipitation weakens to barely more than a fine mist';
  }

  const intensity = Math.min(precipDelta / 15, 1);

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      precipitationChange: 'lessening',
    },
    narrative: [...context.narrative, precipDescription],
    intensity: Math.max(context.intensity, intensity * 0.7), // Lessening is less dramatic than intensifying
  };
};
