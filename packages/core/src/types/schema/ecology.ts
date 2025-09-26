import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { WeatherPropertySpecification } from '~/types/schema/weather';
import { EcosystemURN } from '~/types/taxonomy';

export type SoilTexture = 'clay' | 'sand' | 'loam' | 'silt';
export type SoilRockiness = 'gravelly' | 'stony' | 'lithic';
export type SoilType = `${SoilTexture}:${SoilRockiness}`;

/**
 * The composition of soil in the Place.
 *
 * @example
 *   { 'clay:gravelly': 0.5, 'sand:stony': 0.3, 'loam:lithic': 0.2 } // sums to 1
 */
export type SoilComposition = Partial<Record<SoilType, NormalizedValueBetweenZeroAndOne>>;

export type RockFormationType = 'igneous' | 'sedimentary' | 'metamorphic';
export type RockType = 'basalt' | 'limestone' | 'shale' | 'gneiss' | 'marble' | 'schist' | 'granite' | 'quartzite';
export type BedrockType = `${RockFormationType}:${RockType}`;

/**
 * The composition of the bedrock, as decimal fractions of the total bedrock. They should sum to 1.
 *
 * @example
 *   { 'igneous:basalt': 0.5, 'sedimentary:limestone': 0.3, 'metamorphic:gneiss': 0.2 } // sums to 1
 */
export type BedrockComposition = Partial<Record<BedrockType, NormalizedValueBetweenZeroAndOne>>;

/**
 * An ecological profile describes an ecosystem's intrinsic characteristics. Each Place in the world
 * has an assigned `ecosystem`.
 */
export type EcologicalProfile = {
  temperature: WeatherPropertySpecification;
  pressure: WeatherPropertySpecification;
  humidity: WeatherPropertySpecification;
  soil: SoilComposition;
  bedrock: BedrockComposition;
};

export type Biome = 'steppe' | 'grassland' | 'forest' | 'mountain' | 'jungle' | 'marsh';
export type Climate = 'arid' | 'temperate' | 'tropical';

export const ECOLOGICAL_PROFILES: Partial<Record<EcosystemURN, EcologicalProfile>> = {
  'flux:eco:steppe:arid': {
    temperature: { baseline: 25, amplitude: 3 },  // Generally cool: 22-28°C
    pressure: { baseline: 1020, amplitude: 5 },   // High pressure systems
    humidity: { baseline: 17, amplitude: 3 },    // Dry: 14-20%
    soil: {
      'sand:gravelly': 0.7,
      'loam:gravelly': 0.3,
    },
    bedrock: {
      'igneous:granite': 0.5,
      'sedimentary:limestone': 0.3,
      'metamorphic:gneiss': 0.2,
    }
  },
  'flux:eco:grassland:temperate': {
    temperature: { baseline: 23, amplitude: 13}, // Large swings: 10-36°C
    pressure: { baseline: 1003, amplitude: 4 },   // High pressure, but not as high as the steppe
    humidity: { baseline: 29, amplitude: 13 }, // Large swings in the lower range
    soil: { 'loam:gravelly': 0.3, 'silt:gravelly': 0.7 }, // Deep fertile basin soils
    bedrock: {
      'sedimentary:limestone': 0.5,
      'sedimentary:shale': 0.3,
      'metamorphic:marble': 0.2      // Enables manganese deposits
    }
  },
  'flux:eco:forest:temperate': {
    temperature: { baseline: 23, amplitude: 5  }, // Generally cool: 18-28°C
    pressure: { baseline: 1013, amplitude: 5 },  // Stable high pressure
    humidity: { baseline: 47, amplitude: 13 },    // Moderate humidity: 34-60%
    soil: {
      'clay:gravelly': 0.4,
      'loam:gravelly': 0.4,
      'silt:gravelly': 0.2,
    },
    bedrock: {
      'metamorphic:gneiss': 0.5,
      'igneous:granite': 0.3,
      'sedimentary:shale': 0.2,
    },
 },
  'flux:eco:mountain:arid': {
    temperature: { baseline: 11, amplitude: 5 },  // Cold (6-16)
    pressure: { baseline: 970, amplitude: 15 },   // Low pressure
   humidity: { baseline: 11, amplitude: 13  },    // Dry: 0-22%
    soil: {
      'sand:lithic': 0.4,
      'loam:lithic': 0.3,
      'clay:stony': 0.3,
    },
    bedrock: {
      'metamorphic:gneiss': 0.4,
      'igneous:granite': 0.25,
      'sedimentary:limestone': 0.15,
      'metamorphic:quartzite': 0.1,
      'metamorphic:schist': 0.1,
    },
  },
  'flux:eco:jungle:tropical': {
    temperature: { baseline: 37, amplitude: 3},  // Stable heat: 34-40°C
    pressure: { baseline: 1008, amplitude: 6 },   // Lower tropical pressure
    humidity: { baseline: 67, amplitude: 13 },    // Saturated: 54-80%
    soil: {
      'clay:stony': 0.8,
      'silt:gravelly': 0.2,
    },
    bedrock: {
      'igneous:basalt': 0.6,
      'sedimentary:limestone': 0.4,
    },
  },
  'flux:eco:marsh:tropical': {
    temperature: { baseline: 29, amplitude: 5 },  // Moderated by water: 24-34°C
    pressure: { baseline: 1025, amplitude: 4 },   // Stable high pressure (marsh is in a crater below sea level)
    humidity: { baseline: 79, amplitude: 13 },    // Saturated: 66-92%
    soil: {
      'clay:stony': 0.4,
      'silt:stony': 0.6,
    },
    bedrock: {
      'sedimentary:shale': 0.8,
      'sedimentary:limestone': 0.2,
    },
  },
};
