export type EcologicalProfile = {
  temperature: [number, number];
  pressure: [number, number];
  humidity: [number, number];
};

export type Biome = 'steppe' | 'grassland' | 'forest' | 'mountain' | 'jungle' | 'marsh';
export type Climate = 'arid' | 'temperate' | 'tropical';
export type EcosystemURN = `flux:eco:${Biome}:${Climate}`;

export const ECOLOGICAL_PROFILES = {
  'flux:eco:steppe:arid': {
    temperature: [15.0, 35.0],    // Hot, continental climate
    pressure: [1010.0, 1030.0],   // High pressure systems
    humidity: [15.0, 45.0]        // Arid conditions
  },
  'flux:eco:grassland:temperate': {
    temperature: [5.0, 32.0],     // Large temperature swings
    pressure: [990.0, 1015.0],    // Stable pressure
    humidity: [40.0, 70.0]        // Moderate humidity
  },
  'flux:eco:forest:temperate': {
    temperature: [13.0, 31.0],     // Mild, stable climate
    pressure: [990.0, 1020.0],    // Stable pressure
    humidity: [55.0, 85.0]        // Forest moisture retention
  },
  'flux:eco:mountain:arid': {
    temperature: [5, 25.0],    // Alpine temperature variation
    pressure: [950.0, 990.0],     // Low pressure (high altitude)
    humidity: [10.0, 35.0]        // Arid mountain conditions
  },
  'flux:eco:jungle:tropical': {
    temperature: [23.0, 37.0],    // Consistently hot tropical
    pressure: [1000.0, 1020.0],   // Stable tropical pressure
    humidity: [75.0, 95.0]        // High tropical humidity
  },
  'flux:eco:marsh:tropical': {
    temperature: [13.0, 29.0],    // Cooler wetland temperatures
    pressure: [1020.0, 1040.0],   // Higher pressure (below sea level, in our world)
    humidity: [85.0, 99.0]       // Saturated wetland conditions
  }
} as const as Record<EcosystemURN, EcologicalProfile>;
