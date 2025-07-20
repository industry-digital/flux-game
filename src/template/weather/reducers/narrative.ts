import { WeatherReducer } from '../types';
import { findTransitionSynergies } from '../transitions/detection';
import { detectMeaningfulTransitions, deriveMoodFromTransitions } from '../transitions/meaningful';

/**
 * Narrative enhancement reducer - merges related transitions and creates sophisticated descriptions
 * Pure function that analyzes the current narrative and enhances it with synergistic combinations
 */
export const enhanceNarrative: WeatherReducer = (context, current) => {
  // Detect meaningful transitions to understand what we're working with
  const transitions = detectMeaningfulTransitions(context.previous, current);

  if (transitions.length === 0) {
    return context;
  }

  context.debug?.(`Enhancing narrative with ${transitions.length} transitions`);

  // Look for synergistic transitions that should be merged
  const synergy = findTransitionSynergies(transitions);

  if (synergy && synergy.confidence > 0.7) {
    return handleSynergisticNarrative(context, current, synergy, transitions);
  }

  // Apply general narrative improvements
  return applyGeneralEnhancements(context, current, transitions);
};

/**
 * Handles synergistic narrative combinations - merges related transitions into elegant descriptions
 */
const handleSynergisticNarrative = (
  context: any,
  current: any,
  synergy: { theme: string; confidence: number },
  transitions: any[]
) => {
  const { theme } = synergy;

  let enhancedDescription: string;
  let newMood: 'peaceful' | 'dramatic' | 'ominous' | 'neutral' = context.descriptors.mood;

  switch (theme) {
    case 'dawn-breakthrough':
      enhancedDescription = createDawnBreakthroughDescription(context, current);
      newMood = 'peaceful';
      break;

    case 'dawn-struggle':
      enhancedDescription = createDawnStruggleDescription(context, current);
      newMood = 'ominous';
      break;

    case 'storm-breaking':
      enhancedDescription = createStormBreakingDescription(context, current);
      newMood = 'dramatic';
      break;

    case 'storm-approach':
      enhancedDescription = createStormApproachDescription(context, current);
      newMood = 'ominous';
      break;

    case 'storm-passing':
      enhancedDescription = createStormPassingDescription(context, current);
      newMood = 'peaceful';
      break;

    case 'evening-mist':
      enhancedDescription = createEveningMistDescription(context, current);
      newMood = 'peaceful';
      break;

    default:
      return context; // No enhancement for unknown themes
  }

  // Replace the last few narrative elements with the enhanced version
  const narrativeCount = Math.min(context.narrative.length, 2); // Replace up to 2 sentences
  const enhancedNarrative = [
    ...context.narrative.slice(0, -narrativeCount),
    enhancedDescription
  ];

  const maxIntensity = Math.max(...transitions.map(t => t.intensity));

  return {
    ...context,
    narrative: enhancedNarrative,
    descriptors: {
      ...context.descriptors,
      mood: newMood,
    },
    intensity: Math.max(context.intensity, maxIntensity),
  };
};

/**
 * Creates enhanced descriptions for specific synergistic themes
 */
const createDawnBreakthroughDescription = (context: any, current: any): string => {
  const cloudCover = current.clouds;

  if (cloudCover > 60) {
    return 'Dawn struggles to break through the dispersing clouds, sending tentative rays of golden light across the gradually clearing landscape';
  } else {
    return 'Dawn breaks triumphantly through the clearing clouds, flooding the world with brilliant morning light as the sky opens above';
  }
};

const createDawnStruggleDescription = (context: any, current: any): string => {
  const lightLevel = current.ppfd;

  if (lightLevel < 200) {
    return 'Dawn arrives reluctantly, its light muted and gray as gathering storm clouds choke the morning sky with ominous shadow';
  } else {
    return 'Dawn fights to penetrate the thickening clouds, casting an eerie, filtered light that speaks of weather to come';
  }
};

const createStormBreakingDescription = (context: any, current: any): string => {
  const rainIntensity = current.precipitation;

  if (rainIntensity > 25) {
    return 'The storm breaks with sudden fury, dark clouds unleashing torrential rain that hammers the earth with explosive force';
  } else {
    return 'Storm clouds mass overhead and release their burden, sending the first heavy drops of rain to drum against the waiting ground';
  }
};

const createStormApproachDescription = (context: any, current: any): string => {
  const pressure = current.pressure;

  if (pressure < 990) {
    return 'Dark clouds gather with menacing speed, swallowing the light as atmospheric pressure plummets and the air grows heavy with impending storm';
  } else {
    return 'Storm clouds build on the horizon, their advancing shadow dimming the sun and promising dramatic weather ahead';
  }
};

const createStormPassingDescription = (context: any, current: any): string => {
  const lightLevel = current.ppfd;

  if (lightLevel > 800) {
    return 'The storm passes on, clouds breaking apart to reveal brilliant sunlight that illuminates the rain-washed world with crystal clarity';
  } else {
    return 'Storm clouds retreat across the sky, their departure marks the gentle cessation of rain and a gradual lightening of the air';
  }
};

const createEveningMistDescription = (context: any, current: any): string => {
  const temperature = current.temperature;

  if (temperature < 10) {
    return 'As evening falls, a gentle mist begins to rise from the cooling earth, wrapping the landscape in soft, ethereal veils';
  } else {
    return 'The setting sun draws forth wisps of mist from the warm ground, creating a dreamlike atmosphere as day fades to night';
  }
};

/**
 * Applies general narrative enhancements when no specific synergies are detected
 */
const applyGeneralEnhancements = (context: any, current: any, transitions: any[]) => {
  // Derive overall mood from transitions
  const overallMood = deriveMoodFromTransitions(transitions);

  // Add atmospheric touches to existing descriptions
  let enhancedNarrative = [...context.narrative];

  // Add connecting phrases or atmospheric context if we have multiple phenomena
  if (context.narrative.length > 1 && context.random && context.random() > 0.8) {
    const lastSentence = enhancedNarrative[enhancedNarrative.length - 1];

    // Add atmospheric connectors based on mood
    if (overallMood === 'ominous' && !lastSentence.includes('ominous') && !lastSentence.includes('heavy')) {
      enhancedNarrative[enhancedNarrative.length - 1] += ', lending an ominous quality to the atmosphere';
    } else if (overallMood === 'peaceful' && !lastSentence.includes('peaceful') && !lastSentence.includes('gentle')) {
      enhancedNarrative[enhancedNarrative.length - 1] += ', bringing a sense of peaceful tranquility';
    } else if (overallMood === 'dramatic' && context.intensity > 0.7) {
      enhancedNarrative[enhancedNarrative.length - 1] += ', creating a scene of dramatic atmospheric transformation';
    }
  }

  return {
    ...context,
    narrative: enhancedNarrative,
    descriptors: {
      ...context.descriptors,
      mood: overallMood,
    },
  };
};
