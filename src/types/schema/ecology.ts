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
    temperature: { baseline: 20, amplitude: 7 },  // Generally cool: 13-27°C
    pressure: { baseline: 1020, amplitude: 8 },   // High pressure systems
    humidity: { baseline: 13, amplitude: 7 },    // Dry: 6-20%
    soil: { 'sand:gravelly': 0.7, 'loam:gravelly': 0.3 }, // Weathered granite soils
    bedrock: { 'igneous:granite': 0.6, 'sedimentary:limestone': 0.4 }
  },
  'flux:eco:grassland:temperate': {
    temperature: { baseline: 23, amplitude: 13}, // Large swings: 10-36°C
    pressure: { baseline: 1003, amplitude: 4 },   // High pressure, but not as high as the steppe
    humidity: { baseline: 29, amplitude: 13 }, // Moderate humidity: 16-42%
    soil: { 'loam:gravelly': 0.3, 'silt:gravelly': 0.7 }, // Deep fertile basin soils
    bedrock: { 'sedimentary:limestone': 0.6, 'sedimentary:shale': 0.4 }
  },
  'flux:eco:forest:temperate': {
    temperature: { baseline: 23, amplitude: 5  }, // Generally cool: 18-28°C
    pressure: { baseline: 1013, amplitude: 5 },  // Stable high pressure
    humidity: { baseline: 41, amplitude: 23 },    // Moderate humidity: 18-64%
    soil: { 'clay:gravelly': 0.4, 'loam:gravelly': 0.4, 'silt:gravelly': 0.2 }, // Weathered mixed soils
    bedrock: { 'metamorphic:gneiss': 0.5, 'igneous:granite': 0.3, 'sedimentary:shale': 0.2 }
 },
  'flux:eco:mountain:arid': {
    temperature: { baseline: 12, amplitude: 8 },  // Cold (4-20°C)
    pressure: { baseline: 970, amplitude: 15 },   // Low pressure
    humidity: { baseline: 7, amplitude: 12 },    // Dry: 0-19%
    soil: { 'sand:lithic': 0.4, 'loam:lithic': 0.3, 'clay:stony': 0.3 }, // Thin soils over bedrock
    bedrock: { 'metamorphic:gneiss': 0.5, 'igneous:granite': 0.3, 'sedimentary:limestone': 0.2 }
  },
  'flux:eco:jungle:tropical': {
    temperature: { baseline: 29, amplitude: 5 },  // Stable heat: 24-34°C
    pressure: { baseline: 1008, amplitude: 6 },   // Lower tropical pressure
    humidity: { baseline: 61, amplitude: 29 },    // Saturated: 32-90%
    soil: { 'clay:stony': 0.8, 'silt:gravelly': 0.2 }, // Deep tropical weathering creates clay
    bedrock: { 'igneous:basalt': 0.6, 'sedimentary:limestone': 0.4 } // Volcanic + karst terrain
  },
  'flux:eco:marsh:tropical': {
    temperature: { baseline: 23, amplitude: 5 },  // Moderated by water: 18-28°C
    pressure: { baseline: 1025, amplitude: 4 },   // Stable high pressure (low elevation)
    humidity: { baseline: 61, amplitude: 29 },    // Saturated: 32-90%
    soil: { 'clay:stony': 0.4, 'silt:stony': 0.6 }, // Organic-rich, waterlogged soils
    bedrock: { 'sedimentary:shale': 0.8, 'sedimentary:limestone': 0.2 } // Poor drainage geology
  }
};
