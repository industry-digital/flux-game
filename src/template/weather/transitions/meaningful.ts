import { Weather } from '~/types/schema/weather';
import { detectTimeTransition, TimeTransition } from '../utils/time';
import { detectLightChange, detectCloudChange, isDramaticLightChange } from '../utils/ppfd';
import { PRECIPITATION_THRESHOLDS } from '../utils/ppfd';

/**
 * Meaningful atmospheric transitions that warrant description
 * Based on the combinatorial explosion solution - focus only on transitions that matter to players
 */

export type MeaningfulTransition = {
  type: 'solar' | 'light' | 'cloud' | 'precipitation' | 'fog' | 'storm';
  subtype?: string;
  intensity: number; // 0-1 scale
  priority: number;  // Higher = more important for narrative
};

/**
 * Detects all meaningful atmospheric transitions between weather states
 */
export const detectMeaningfulTransitions = (
  previous: Weather,
  current: Weather
): MeaningfulTransition[] => {
  const transitions: MeaningfulTransition[] = [];

  // Solar geometry transitions (highest priority for time awareness)
  const solarTransition = detectSolarTransitions(previous, current);
  if (solarTransition) {
    transitions.push(solarTransition);
  }

  // Dramatic light changes (high priority for immediate visual impact)
  const lightTransition = detectDramaticLightTransitions(previous, current);
  if (lightTransition) {
    transitions.push(lightTransition);
  }

  // Cloud dynamics (medium-high priority for sky changes)
  const cloudTransition = detectCloudTransitions(previous, current);
  if (cloudTransition) {
    transitions.push(cloudTransition);
  }

  // Precipitation events (high priority for immediate gameplay impact)
  const precipitationTransition = detectPrecipitationTransitions(previous, current);
  if (precipitationTransition) {
    transitions.push(precipitationTransition);
  }

  // Fog formation/dissipation (medium priority for atmospheric mood)
  const fogTransition = detectFogTransitions(previous, current);
  if (fogTransition) {
    transitions.push(fogTransition);
  }

  // Storm events (highest priority for dramatic weather)
  const stormTransition = detectStormTransitions(previous, current);
  if (stormTransition) {
    transitions.push(stormTransition);
  }

  // Sort by priority (highest first) for narrative ordering
  return transitions.sort((a, b) => b.priority - a.priority);
};

/**
 * Detects meaningful solar geometry transitions (sunrise, sunset, etc.)
 */
const detectSolarTransitions = (
  previous: Weather,
  current: Weather
): MeaningfulTransition | null => {
  const timeTransition = detectTimeTransition(previous.ts, current.ts);

  if (!timeTransition) return null;

  const intensityMap: Record<TimeTransition, number> = {
    'sunrise': 0.7,    // Dawn is always meaningful
    'sunset': 0.6,     // Dusk is meaningful
    'deepening': 0.4,  // Night deepening is atmospheric
  };

  return {
    type: 'solar',
    subtype: timeTransition,
    intensity: intensityMap[timeTransition],
    priority: 90, // Very high priority - time transitions are always important
  };
};

/**
 * Detects dramatic light changes that warrant specific description
 */
const detectDramaticLightTransitions = (
  previous: Weather,
  current: Weather
): MeaningfulTransition | null => {
  if (!isDramaticLightChange(previous, current)) return null;

  const lightChange = detectLightChange(previous, current);
  if (lightChange === 'stable') return null;

  // Calculate intensity based on magnitude of change
  const ppfdDelta = Math.abs(current.ppfd - previous.ppfd);
  const ppfdChangePercent = ppfdDelta / Math.max(previous.ppfd, 1);
  const intensity = Math.min(Math.max(ppfdChangePercent, ppfdDelta / 800), 1);

  return {
    type: 'light',
    subtype: lightChange, // 'brightening' or 'dimming'
    intensity,
    priority: 80, // High priority - dramatic light changes are very noticeable
  };
};

/**
 * Detects significant cloud cover transitions
 */
const detectCloudTransitions = (
  previous: Weather,
  current: Weather
): MeaningfulTransition | null => {
  const cloudChange = detectCloudChange(previous, current);
  if (cloudChange === 'stable') return null;

  // Calculate intensity based on cloud change magnitude
  const cloudDelta = Math.abs(current.clouds - previous.clouds);
  const intensity = Math.min(cloudDelta / 50, 1); // Normalize to 50% change = max intensity

  return {
    type: 'cloud',
    subtype: cloudChange, // 'gathering' or 'clearing'
    intensity,
    priority: 60, // Medium-high priority - sky changes are noticeable
  };
};

/**
 * Detects precipitation transitions (rain starting/stopping/changing intensity)
 */
const detectPrecipitationTransitions = (
  previous: Weather,
  current: Weather
): MeaningfulTransition | null => {
  const precipDelta = current.precipitation - previous.precipitation;
  const precipChange = Math.abs(precipDelta);

  // Must be significant change to warrant description
  if (precipChange < 0.5) return null;

  let subtype: string;
  let intensity: number;

  if (previous.precipitation < PRECIPITATION_THRESHOLDS.LIGHT_DRIZZLE && current.precipitation >= PRECIPITATION_THRESHOLDS.LIGHT_DRIZZLE) {
    subtype = 'starting';
    intensity = Math.min(current.precipitation / 10, 1);
  } else if (previous.precipitation >= PRECIPITATION_THRESHOLDS.LIGHT_DRIZZLE && current.precipitation < PRECIPITATION_THRESHOLDS.LIGHT_DRIZZLE) {
    subtype = 'stopping';
    intensity = Math.min(previous.precipitation / 10, 1);
  } else if (precipDelta > 2) {
    subtype = 'intensifying';
    intensity = Math.min(precipChange / 15, 1);
  } else if (precipDelta < -2) {
    subtype = 'lessening';
    intensity = Math.min(precipChange / 15, 1);
  } else {
    return null; // No meaningful transition
  }

  return {
    type: 'precipitation',
    subtype,
    intensity,
    priority: 75, // High priority - precipitation directly affects gameplay
  };
};

/**
 * Detects fog formation or dissipation
 */
const detectFogTransitions = (
  previous: Weather,
  current: Weather
): MeaningfulTransition | null => {
  const fogDelta = current.fog - previous.fog;
  const fogChange = Math.abs(fogDelta);

  // Must be significant fog change
  if (fogChange < 0.3) return null;

  const subtype = fogDelta > 0 ? 'forming' : 'dissipating';
  const intensity = Math.min(fogChange / 0.7, 1); // Normalize to 70% change = max intensity

  return {
    type: 'fog',
    subtype,
    intensity,
    priority: 50, // Medium priority - affects visibility and atmosphere
  };
};

/**
 * Detects storm events (combinations of dramatic weather changes)
 */
const detectStormTransitions = (
  previous: Weather,
  current: Weather
): MeaningfulTransition | null => {
  // Storm approaching: rapid cloud buildup + pressure drop + light dimming
  const cloudDelta = current.clouds - previous.clouds;
  const pressureDelta = previous.pressure.value - current.pressure.value; // Pressure DROP indicates storm
  const ppfdDelta = previous.ppfd - current.ppfd; // Light DIMMING indicates storm

  // Storm approaching criteria
  if (cloudDelta > 30 && pressureDelta > 5 && ppfdDelta > 300) {
    const intensity = Math.min((cloudDelta / 40) * (pressureDelta / 15) * (ppfdDelta / 600), 1);
    return {
      type: 'storm',
      subtype: 'approaching',
      intensity,
      priority: 95, // Highest priority - storms are dramatic and impactful
    };
  }

  // Storm clearing: clouds clearing + pressure rising + light brightening
  if (cloudDelta < -30 && pressureDelta < -5 && ppfdDelta < -300) {
    const intensity = Math.min((Math.abs(cloudDelta) / 40) * (Math.abs(pressureDelta) / 15) * (Math.abs(ppfdDelta) / 600), 1);
    return {
      type: 'storm',
      subtype: 'clearing',
      intensity,
      priority: 85, // Very high priority - storm clearing is relief
    };
  }

  return null;
};

/**
 * Determines the overall mood/atmosphere suggested by the transitions
 */
export const deriveMoodFromTransitions = (
  transitions: MeaningfulTransition[]
): 'peaceful' | 'dramatic' | 'ominous' | 'neutral' => {
  if (transitions.length === 0) return 'neutral';

  // Look for ominous patterns
  const hasStormApproaching = transitions.some(t => t.type === 'storm' && t.subtype === 'approaching');
  const hasDarkening = transitions.some(t => t.type === 'light' && t.subtype === 'dimming' && t.intensity > 0.6);
  const hasHeavyClouds = transitions.some(t => t.type === 'cloud' && t.subtype === 'gathering' && t.intensity > 0.6);

  if (hasStormApproaching || (hasDarkening && hasHeavyClouds)) {
    return 'ominous';
  }

  // Look for peaceful patterns
  const hasStormClearing = transitions.some(t => t.type === 'storm' && t.subtype === 'clearing');
  const hasBrightening = transitions.some(t => t.type === 'light' && t.subtype === 'brightening');
  const hasCloudsClearing = transitions.some(t => t.type === 'cloud' && t.subtype === 'clearing');
  const hasRainStopping = transitions.some(t => t.type === 'precipitation' && t.subtype === 'stopping');

  if (hasStormClearing || ((hasBrightening || hasCloudsClearing) && hasRainStopping)) {
    return 'peaceful';
  }

  // Look for dramatic patterns (high intensity changes)
  const maxIntensity = Math.max(...transitions.map(t => t.intensity));
  const highPriorityTransitions = transitions.filter(t => t.priority >= 80);

  if (maxIntensity > 0.7 || highPriorityTransitions.length >= 2) {
    return 'dramatic';
  }

  return 'neutral';
};
