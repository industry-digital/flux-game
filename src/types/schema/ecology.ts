import { WeatherPropertySpecification } from '~/types/schema/weather';
import { EcosystemURN } from '~/types/taxonomy';

export type EcologicalProfile = {
  temperature: WeatherPropertySpecification;
  pressure: WeatherPropertySpecification;
  humidity: WeatherPropertySpecification;
};

export type Biome = 'steppe' | 'grassland' | 'forest' | 'mountain' | 'jungle' | 'marsh';
export type Climate = 'arid' | 'temperate' | 'tropical';

export const ECOLOGICAL_PROFILES = {
  'flux:eco:steppe:arid': {
    temperature: { baseline: 20, amplitude: 7 },  // Generally cool: 13-27°C
    pressure: { baseline: 1020, amplitude: 8 },   // High pressure systems
    humidity: { baseline: 23, amplitude: 12 }     // Dry: 11-35%
  },
  'flux:eco:grassland:temperate': {
    temperature: { baseline: 23, amplitude: 13}, // Large swings: 10-36°C
    pressure: { baseline: 1003, amplitude: 4 },   // High pressure, but not as high as the steppe
    humidity: { baseline: 30, amplitude: 11 }      // Dry: 19-41%, but not as dry as the steppe
  },
  'flux:eco:forest:temperate': {
    temperature: { baseline: 23, amplitude: 5  }, // Generally cool: 18-28°C
    pressure: { baseline: 1013, amplitude: 5 },  // Stable high pressure
    humidity: { baseline: 51, amplitude: 17 }, // Moderate humidity: 34-68%
 },
  'flux:eco:mountain:arid': {
    temperature: { baseline: 12, amplitude: 8 },  // Cold (4-20°C)
    pressure: { baseline: 970, amplitude: 15 },   // Low pressure
    humidity: { baseline: 25, amplitude: 12 }     // Dry: 13-37%
  },
  'flux:eco:jungle:tropical': {
    temperature: { baseline: 29, amplitude: 5 },  // Stable heat: 24-34°C
    pressure: { baseline: 1008, amplitude: 6 },   // Lower tropical pressure
    humidity: { baseline: 88, amplitude: 8 }      // Saturated: 80-96%
  },
  'flux:eco:marsh:tropical': {
    temperature: { baseline: 23, amplitude: 5 },  // Moderated by water: 18-28°C
    pressure: { baseline: 1025, amplitude: 4 },   // Stable high pressure (low elevation)
    humidity: { baseline: 94, amplitude:5 }      // Near-saturated: 89-99%
  }
} as unknown as Record<EcosystemURN, EcologicalProfile>;
