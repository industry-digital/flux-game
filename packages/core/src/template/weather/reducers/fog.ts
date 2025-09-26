import { WeatherReducer } from '../types';

/**
 * Fog reducer - handles fog formation and dissipation with focus on visibility and atmospheric mood
 * Pure function that processes fog transitions and their impact on atmosphere
 */
export const applyFog: WeatherReducer = (context, current) => {
  const fogDelta = current.fog - context.previous.fog;
  const fogChange = Math.abs(fogDelta);

  // Must be significant fog change to warrant description
  if (fogChange < 0.3) {
    return context;
  }

  context.debug?.(`Fog transition detected: ${context.previous.fog} -> ${current.fog} intensity`);

  const intensity = Math.min(fogChange / 0.7, 1); // Normalize to 70% change = max intensity

  if (fogDelta > 0) {
    return handleFogForming(context, current, intensity);
  } else {
    return handleFogDissipating(context, current, intensity);
  }
};

/**
 * Handles fog forming/thickening
 */
const handleFogForming = (context: any, current: any, intensity: number) => {
  const finalFogIntensity = current.fog;
  const temperature = current.temperature;
  const humidity = current.humidity;
  const timeOfDay = context.descriptors.timeOfDay;

  let fogDescription: string;

  // Dense fog formation
  if (finalFogIntensity > 0.8) {
    if (timeOfDay === 'night' || timeOfDay === 'dawn') {
      fogDescription = 'A thick, impenetrable fog rolls in, swallowing everything in its ghostly embrace';
    } else {
      fogDescription = 'Dense fog suddenly envelops the area, reducing visibility to mere steps ahead';
    }
  }
  // Heavy fog formation
  else if (finalFogIntensity > 0.6) {
    if (temperature < 5 && timeOfDay === 'dawn') {
      fogDescription = 'Cold fog rises from the ground in the early morning chill, blanketing the landscape';
    } else if (humidity > 90) {
      fogDescription = 'Heavy fog begins to form from the saturated air, creating an ethereal veil';
    } else {
      fogDescription = 'A substantial fog bank drifts in, significantly reducing visibility';
    }
  }
  // Moderate fog formation
  else if (finalFogIntensity > 0.4) {
    if (context.previous.precipitation > 1 && current.precipitation < 0.5) {
      fogDescription = 'Wisps of fog begin to rise from the rain-soaked ground';
    } else if (timeOfDay === 'dusk' || timeOfDay === 'night') {
      fogDescription = 'Evening mist begins to gather, adding mystery to the darkening landscape';
    } else {
      fogDescription = 'A moderate fog starts to form, softening the edges of distant objects';
    }
  }
  // Light fog/mist formation
  else {
    if (temperature < 10 && humidity > 80) {
      fogDescription = 'A fine mist begins to form in the cool, humid air';
    } else {
      fogDescription = 'Tendrils of light fog start to drift across the area';
    }
  }

  // Add atmospheric context based on conditions
  if (context.random && context.random() > 0.7) {
    if (timeOfDay === 'dawn' && temperature < 5) {
      fogDescription += ', born from the collision of cold air and warming earth';
    } else if (current.clouds > 70 && humidity > 85) {
      fogDescription += ', as moisture-laden air meets the cooling ground';
    } else if (timeOfDay === 'night') {
      fogDescription += ', lending an otherworldly quality to the night';
    }
  }

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      fogChange: 'forming',
      mood: finalFogIntensity > 0.6 ? 'ominous' : context.descriptors.mood,
    },
    narrative: [...context.narrative, fogDescription],
    intensity: Math.max(context.intensity, intensity),
  };
};

/**
 * Handles fog dissipating/clearing
 */
const handleFogDissipating = (context: any, current: any, intensity: number) => {
  const previousFogIntensity = context.previous.fog;
  const finalFogIntensity = current.fog;
  const temperature = current.temperature;
  const ppfd = current.ppfd;
  const timeOfDay = context.descriptors.timeOfDay;

  let fogDescription: string;

  // Dense fog clearing
  if (previousFogIntensity > 0.8) {
    if (ppfd > 800 && timeOfDay === 'day') {
      fogDescription = 'The dense fog begins to burn off under the strengthening sun, revealing the hidden landscape piece by piece';
    } else if (finalFogIntensity < 0.3) {
      fogDescription = 'The thick fog rapidly dissipates, restoring visibility to the surrounding area';
    } else {
      fogDescription = 'The impenetrable fog starts to thin, allowing glimpses of the world beyond';
    }
  }
  // Heavy fog clearing
  else if (previousFogIntensity > 0.6) {
    if (temperature > 15 && ppfd > 600) {
      fogDescription = 'The heavy fog retreats as warming air disperses the moisture';
    } else {
      fogDescription = 'The fog bank begins to lift and drift away, gradually improving visibility';
    }
  }
  // Moderate fog clearing
  else if (previousFogIntensity > 0.4) {
    if (timeOfDay === 'day' && ppfd > 400) {
      fogDescription = 'The fog thins and disperses under the growing influence of daylight';
    } else {
      fogDescription = 'The mist begins to clear, making distant objects more distinct';
    }
  }
  // Light fog clearing
  else {
    if (ppfd > 200) {
      fogDescription = 'The last wisps of fog evaporate, leaving the air clear and bright';
    } else {
      fogDescription = 'The gentle mist fades away, restoring normal visibility';
    }
  }

  // Add atmospheric context for fog clearing
  if (context.random && context.random() > 0.6) {
    if (timeOfDay === 'day' && temperature > 20) {
      fogDescription += ', and the warming air feels fresh and clean';
    } else if (ppfd > 1000) {
      fogDescription += ', as brilliant sunlight cuts through the remaining wisps';
    } else if (finalFogIntensity < 0.1) {
      fogDescription += ', leaving the world sharp and clearly defined once more';
    }
  }

  return {
    ...context,
    descriptors: {
      ...context.descriptors,
      fogChange: 'dissipating',
      mood: finalFogIntensity < 0.2 ? 'peaceful' : context.descriptors.mood,
    },
    narrative: [...context.narrative, fogDescription],
    intensity: Math.max(context.intensity, intensity * 0.8), // Clearing is slightly less dramatic
  };
};
