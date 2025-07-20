import { WeatherReducer } from '../types';
import { detectCloudChange } from '../utils/ppfd';

/**
 * Cloud cover reducer - handles cloud formation/clearing and their atmospheric effects
 * Pure function that processes cloud transitions and their impact on lighting
 */
export const applyCloudCover: WeatherReducer = (context, current) => {
  const cloudChange = detectCloudChange(context.previous, current);

  if (cloudChange === 'stable') {
    return context;
  }

  const cloudDelta = Math.abs(current.clouds - context.previous.clouds);
  const intensity = Math.min(cloudDelta / 50, 1); // Normalize to 50% change = max intensity

  context.debug?.(`Cloud transition detected: ${cloudChange}, delta: ${cloudDelta}%`);

  if (cloudChange === 'gathering') {
    return handleCloudsGathering(context, current, intensity);
  } else {
    return handleCloudsClearing(context, current, intensity);
  }
};

/**
 * Handles clouds gathering/building up
 */
const handleCloudsGathering = (context: any, current: any, intensity: number) => {
  const finalCloudCover = current.clouds;
  const pressureDrop = context.previous.pressure - current.pressure;
  const lightDimming = context.previous.ppfd - current.ppfd;

  let cloudDescription: string;

  // Dramatic storm cloud buildup
  if (finalCloudCover > 80 && intensity > 0.6 && pressureDrop > 5) {
    if (lightDimming > 400) {
      cloudDescription = 'Dark storm clouds boil up rapidly, swallowing the light and casting an ominous shadow over the landscape';
    } else {
      cloudDescription = 'Towering storm clouds mass overhead, their dark bulk promising weather to come';
    }
  }
  // Heavy overcast formation
  else if (finalCloudCover > 70 && intensity > 0.4) {
    cloudDescription = 'A heavy overcast builds across the sky, turning the light flat and gray';
  }
  // Moderate cloud buildup
  else if (finalCloudCover > 40) {
    if (lightDimming > 200) {
      cloudDescription = 'Clouds gather overhead, dimming the sunlight and changing the quality of the day';
    } else {
      cloudDescription = 'Scattered clouds begin to fill the sky, drifting together into larger formations';
    }
  }
  // Light cloud formation
  else {
    cloudDescription = 'Wisps of cloud drift across the sky, gradually thickening';
  }

  // Add atmospheric pressure context if significant
  if (pressureDrop > 10 && context.random && context.random() > 0.7) {
    cloudDescription += ', and the air feels heavy with atmospheric tension';
  }

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      cloudChange: 'gathering',
    },
    narrative: [...context.narrative, cloudDescription],
    intensity: Math.max(context.intensity, intensity),
  };
};

/**
 * Handles clouds clearing/dissipating
 */
const handleCloudsClearing = (context: any, current: any, intensity: number) => {
  const finalCloudCover = current.clouds;
  const pressureRise = current.pressure - context.previous.pressure;
  const lightBrightening = current.ppfd - context.previous.ppfd;

  let cloudDescription: string;

  // Dramatic clearing after storm
  if (context.previous.clouds > 80 && finalCloudCover < 30 && intensity > 0.6) {
    if (lightBrightening > 400) {
      cloudDescription = 'The storm clouds part dramatically, and brilliant sunlight bursts through to illuminate the landscape';
    } else {
      cloudDescription = 'Heavy clouds break apart and drift away, revealing patches of clear sky';
    }
  }
  // Overcast clearing
  else if (context.previous.clouds > 60 && finalCloudCover < 40) {
    if (lightBrightening > 200) {
      cloudDescription = 'The overcast begins to break up, allowing welcome shafts of sunlight to penetrate';
    } else {
      cloudDescription = 'The gray ceiling of clouds starts to fragment, creating openings to the sky beyond';
    }
  }
  // Moderate clearing
  else if (intensity > 0.3) {
    if (finalCloudCover < 20) {
      cloudDescription = 'Scattered clouds drift apart, leaving the sky increasingly clear';
    } else {
      cloudDescription = 'The clouds begin to thin and separate, opening gaps of blue sky';
    }
  }
  // Light clearing
  else {
    cloudDescription = 'The cloud cover gradually thins, becoming less substantial';
  }

  // Add high pressure context if significant
  if (pressureRise > 8 && context.random && context.random() > 0.8) {
    cloudDescription += ', and the air feels crisp and clear';
  }

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      cloudChange: 'clearing',
    },
    narrative: [...context.narrative, cloudDescription],
    intensity: Math.max(context.intensity, intensity),
  };
};
