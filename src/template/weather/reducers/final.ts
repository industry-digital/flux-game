import { WeatherReducer } from '../types';

/**
 * Final rendering reducer - composes all narrative elements into the final description
 * Pure function that formats and joins the accumulated narrative sentences
 */
export const renderFinalDescription: WeatherReducer = (context, current) => {
  // If no narrative was built, return empty context (caller will return empty string)
  if (context.narrative.length === 0) {
    context.debug?.('No narrative elements to render');
    return context;
  }

  context.debug?.(`Rendering final description from ${context.narrative.length} narrative elements`);

  // Clean and format the narrative
  const cleanedNarrative = cleanNarrativeElements(context.narrative);

  // Join sentences with periods, ensuring proper spacing
  const finalDescription = cleanedNarrative
    .join('. ')
    .replace(/\.\./g, '.') // Remove double periods
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();

  // Add final atmospheric touches based on intensity and mood
  const enhancedDescription = addFinalTouches(finalDescription, context);

  context.debug?.(`Final description: "${enhancedDescription}"`);

  // Store the final result in a way the main function can access it
  return {
    ...context,
    finalDescription: enhancedDescription,
  };
};

/**
 * Cleans and standardizes narrative elements
 */
const cleanNarrativeElements = (narrative: string[]): string[] => {
  return narrative
    .filter(sentence => sentence && sentence.trim().length > 0) // Remove empty sentences
    .map(sentence => {
      let cleaned = sentence.trim();

      // Ensure first letter is capitalized
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }

      // Remove trailing periods (we'll add them when joining)
      if (cleaned.endsWith('.')) {
        cleaned = cleaned.slice(0, -1);
      }

      return cleaned;
    })
    .filter(sentence => sentence.length > 0); // Final filter after cleaning
};

/**
 * Adds final atmospheric touches based on context
 */
const addFinalTouches = (description: string, context: any): string => {
  let enhanced = description;

  // For very dramatic changes, add emphasis
  if (context.intensity > 0.8 && context.random && context.random() > 0.7) {
    // Don't add emphasis if already dramatic
    if (!enhanced.toLowerCase().includes('dramatic') &&
        !enhanced.toLowerCase().includes('sudden') &&
        !enhanced.toLowerCase().includes('rapid')) {

      if (context.descriptors.mood === 'ominous') {
        enhanced += ', transforming the very character of the day';
      } else if (context.descriptors.mood === 'dramatic') {
        enhanced += ', creating a spectacle of natural power';
      }
    }
  }

  // For peaceful transitions, add gentle closure
  if (context.descriptors.mood === 'peaceful' && context.intensity < 0.5 &&
      context.random && context.random() > 0.8) {
    if (!enhanced.toLowerCase().includes('peaceful') &&
        !enhanced.toLowerCase().includes('gentle') &&
        !enhanced.toLowerCase().includes('tranquil')) {
      enhanced += ', settling into gentle tranquility';
    }
  }

  return enhanced;
};

/**
 * Utility function to extract the final description from context
 * Used by the main describeWeather function
 */
export const extractFinalDescription = (context: any): string => {
  return context.finalDescription || '';
};
