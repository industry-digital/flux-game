import { Weather } from '~/types/entity/place';
import { MeaningfulTransition } from './meaningful';

/**
 * Additional transition detection utilities and context analysis
 */

/**
 * Checks if multiple transitions create a coherent narrative theme
 */
export const findTransitionSynergies = (
  transitions: MeaningfulTransition[]
): { theme: string; confidence: number } | null => {
  if (transitions.length < 2) return null;

  // Dawn + clouds clearing = "Dawn breaks through clearing clouds"
  const hasSunrise = transitions.some(t => t.type === 'solar' && t.subtype === 'sunrise');
  const hasCloudsClearing = transitions.some(t => t.type === 'cloud' && t.subtype === 'clearing');
  if (hasSunrise && hasCloudsClearing) {
    return { theme: 'dawn-breakthrough', confidence: 0.9 };
  }

  // Dawn + clouds gathering = "Dawn struggles through gathering clouds"
  const hasCloudsGathering = transitions.some(t => t.type === 'cloud' && t.subtype === 'gathering');
  if (hasSunrise && hasCloudsGathering) {
    return { theme: 'dawn-struggle', confidence: 0.8 };
  }

  // Storm approaching + rain starting = "Storm breaks"
  const hasStormApproaching = transitions.some(t => t.type === 'storm' && t.subtype === 'approaching');
  const hasRainStarting = transitions.some(t => t.type === 'precipitation' && t.subtype === 'starting');
  if (hasStormApproaching && hasRainStarting) {
    return { theme: 'storm-breaking', confidence: 0.95 };
  }

  // Light dimming + clouds gathering = "Approaching storm"
  const hasLightDimming = transitions.some(t => t.type === 'light' && t.subtype === 'dimming');
  if (hasLightDimming && hasCloudsGathering) {
    return { theme: 'storm-approach', confidence: 0.7 };
  }

  // Storm clearing + rain stopping = "Storm passing"
  const hasStormClearing = transitions.some(t => t.type === 'storm' && t.subtype === 'clearing');
  const hasRainStopping = transitions.some(t => t.type === 'precipitation' && t.subtype === 'stopping');
  if (hasStormClearing && hasRainStopping) {
    return { theme: 'storm-passing', confidence: 0.9 };
  }

  // Sunset + fog forming = "Evening mist"
  const hasSunset = transitions.some(t => t.type === 'solar' && t.subtype === 'sunset');
  const hasFogForming = transitions.some(t => t.type === 'fog' && t.subtype === 'forming');
  if (hasSunset && hasFogForming) {
    return { theme: 'evening-mist', confidence: 0.8 };
  }

  return null;
};

/**
 * Determines if transitions should be merged into a single description
 */
export const shouldMergeTransitions = (
  transitions: MeaningfulTransition[]
): boolean => {
  // Always merge if we have a coherent theme
  const synergy = findTransitionSynergies(transitions);
  if (synergy && synergy.confidence > 0.7) {
    return true;
  }

  // Merge if we have related atmospheric phenomena
  const transitionTypes = new Set(transitions.map(t => t.type));

  // Related: solar + light changes
  if (transitionTypes.has('solar') && transitionTypes.has('light')) {
    return true;
  }

  // Related: cloud + light changes
  if (transitionTypes.has('cloud') && transitionTypes.has('light')) {
    return true;
  }

  // Related: precipitation + cloud changes
  if (transitionTypes.has('precipitation') && transitionTypes.has('cloud')) {
    return true;
  }

  // Don't merge unrelated phenomena
  return false;
};

/**
 * Prioritizes transitions for narrative ordering
 */
export const prioritizeTransitionsForNarrative = (
  transitions: MeaningfulTransition[]
): MeaningfulTransition[] => {
  // Group transitions by priority tier
  const highPriority = transitions.filter(t => t.priority >= 80);
  const mediumPriority = transitions.filter(t => t.priority >= 60 && t.priority < 80);
  const lowPriority = transitions.filter(t => t.priority < 60);

  // Within each tier, sort by intensity (highest first)
  const sortByIntensity = (a: MeaningfulTransition, b: MeaningfulTransition) =>
    b.intensity - a.intensity;

  return [
    ...highPriority.sort(sortByIntensity),
    ...mediumPriority.sort(sortByIntensity),
    ...lowPriority.sort(sortByIntensity),
  ];
};

/**
 * Filters out redundant or conflicting transitions
 */
export const filterRedundantTransitions = (
  transitions: MeaningfulTransition[]
): MeaningfulTransition[] => {
  const filtered: MeaningfulTransition[] = [];

  for (const transition of transitions) {
    // Skip if we already have a higher-priority transition of the same type
    const existingOfSameType = filtered.find(t =>
      t.type === transition.type && t.priority >= transition.priority
    );

    if (!existingOfSameType) {
      // Remove any lower-priority transitions of the same type
      const indexToRemove = filtered.findIndex(t =>
        t.type === transition.type && t.priority < transition.priority
      );

      if (indexToRemove >= 0) {
        filtered.splice(indexToRemove, 1);
      }

      filtered.push(transition);
    }
  }

  return filtered;
};

/**
 * Analyzes temporal context of transitions to improve descriptions
 */
export const analyzeTemporalContext = (
  previous: Weather,
  current: Weather
): { timeContext: string; seasonalHint: string | null } => {
  const currentHour = new Date(current.ts).getUTCHours();
  const currentMonth = new Date(current.ts).getUTCMonth(); // 0-11

  // Time context
  let timeContext = 'during the day';
  if (currentHour >= 5 && currentHour < 8) {
    timeContext = 'in the early morning hours';
  } else if (currentHour >= 18 && currentHour < 21) {
    timeContext = 'as evening approaches';
  } else if (currentHour >= 21 || currentHour < 5) {
    timeContext = 'in the darkness of night';
  } else if (currentHour >= 11 && currentHour < 14) {
    timeContext = 'under the midday sun';
  }

  // Seasonal hints (Northern Hemisphere assumption)
  let seasonalHint: string | null = null;
  if (currentMonth >= 2 && currentMonth <= 4) { // Mar-May
    seasonalHint = 'spring';
  } else if (currentMonth >= 5 && currentMonth <= 7) { // Jun-Aug
    seasonalHint = 'summer';
  } else if (currentMonth >= 8 && currentMonth <= 10) { // Sep-Nov
    seasonalHint = 'autumn';
  } else { // Dec-Feb
    seasonalHint = 'winter';
  }

  return { timeContext, seasonalHint };
};
