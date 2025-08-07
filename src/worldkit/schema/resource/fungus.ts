import { UnitOfMeasure, TimeUnit, GOLDEN_RATIO } from '~/types';
import { BulkResourceSchema, FitnessEvaluationStrategy } from '~/types/schema/resource';

// Helper function to create fungus schemas with proper typing
export function createFungusSchema(overrides: Partial<BulkResourceSchema> = {}): BulkResourceSchema {
  return {
    kind: 'mushroom',
    provides: ['mushroom'],
    fitness: {
      strategy: FitnessEvaluationStrategy.FUNGUS,
      min: 0.5,
    },
    quantification: {
      type: 'bulk',
      quantity: {
        measure: UnitOfMeasure.EACH,
        min: 0,
        capacity: 3,
      }
    },
    requirements: {
      temperature: { min: 10, max: 30 },
      humidity: { min: 50, max: 90 },
      ppfd: { max: 400 },
    },
    growth: {
      curve: 'LOGISTIC',
      duration: [1, TimeUnit.DAY]
    },
    decay: {
      curve: 'EXPONENTIAL',
      duration: [3, TimeUnit.DAY]
    },
    // Fungi vary - some cluster, some are territorial
    constraints: {
      maxNeighbors: 2,      // Moderate clustering
      inhibitionRadius: 1   // Local competition
    },
    ...overrides
  } as BulkResourceSchema;
}

export const TruffleSchema: BulkResourceSchema = createFungusSchema({
  name: 'truffle',
  slug: 'truffle',
  provides: ['mushroom', 'seeds'],
  requirements: {
    temperature: { min: 10, max: 30 },
    humidity: { min: 50, max: 90 },
    ppfd: { max: 400 },
    biomes: ['forest']
  },
  constraints: {
    maxNeighbors: 0,      // Override: territorial
    inhibitionRadius: 1
  }
});

// Steppe/Arid - Desert fungi that emerge only after rare rains
export const DesertPuffballSchema: BulkResourceSchema = createFungusSchema({
  name: 'desert puffball',
  slug: 'desert-puffball',
  provides: ['mushroom', 'spores'],
  requirements: {
    temperature: { min: 15, max: 35 },
    humidity: { min: 35, max: 60 }, // Need higher humidity than typical desert
    precipitation: { min: 2.0 }, // Only after significant rainfall
    ppfd: { max: 200 }, // Very low light, sheltered spots
    climates: ['arid']
  },
  growth: {
    curve: 'EXPONENTIAL', // Rapid emergence after rain
    duration: [1, TimeUnit.HOUR]
  },
  decay: {
    curve: 'EXPONENTIAL', // Quick decay in harsh conditions
    duration: [3, TimeUnit.DAY]
  }
});

// Grassland/Temperate - Classic meadow mushroom, autumn fruiting
export const MeadowMushroomSchema: BulkResourceSchema = createFungusSchema({
  name: 'meadow mushroom',
  slug: 'meadow-mushroom',
  requirements: {
    temperature: { min: 5, max: 25 },
    humidity: { min: 50, max: 80 },
    ppfd: { max: 600 }, // Can handle more light in open grassland
    climates: ['temperate']
  }
});

// Forest/Temperate - Chanterelles, summer to fall, lunar dependent
export const ChanterelleSchema: BulkResourceSchema = createFungusSchema({
  name: 'chanterelle',
  slug: 'chanterelle',
  provides: ['mushroom', 'oils'],
  requirements: {
    temperature: { min: 13, max: 28 },
    humidity: { min: 65, max: 90 },
    ppfd: { max: 300 }, // Deep forest shade
    biomes: ['forest']
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [10, TimeUnit.DAY] // Slower growth for premium mushroom
  }
});

// Mountain/Arid - Alpine fungi, very short season, cold-adapted
export const AlpineBoleteSchema: BulkResourceSchema = createFungusSchema({
  name: 'alpine bolete',
  slug: 'alpine-bolete',
  provides: ['mushroom', 'resins'],
  requirements: {
    temperature: { min: 2, max: 18 }, // Cold mountain conditions
    humidity: { min: 30, max: 50 }, // Lower humidity tolerance
    pressure: { min: 950, max: 990 }, // High altitude low pressure
    ppfd: { max: 800 }, // Can handle mountain sun when sheltered
    biomes: ['mountain']
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [1, TimeUnit.DAY],
  },
  decay: {
    curve: 'LINEAR',
    duration: [7, TimeUnit.DAY] // Hardy, longer lasting
  }
});

// Jungle/Tropical - Exotic fungi, new moon dependent (darkness loving)
export const BloodRedCupSchema: BulkResourceSchema = createFungusSchema({
  name: 'blood-red cup fungus',
  slug: 'blood-red-cup-fungus',
  provides: ['mushroom', 'dyes'],
  requirements: {
    temperature: { min: 24, max: 35 },
    humidity: { min: 80, max: 98 },
    ppfd: { max: 100 }, // Very deep jungle shade
    biomes: ['jungle']
  }
});

// Marsh/Tropical - Bracket fungi on dead wood, seasonal but long-lasting
export const SwampBracketSchema: BulkResourceSchema = createFungusSchema({
  name: 'swamp bracket',
  slug: 'swamp-bracket',
  provides: ['mushroom', 'tinder', 'medicine'],
  requirements: {
    temperature: { min: 15, max: 29 },
    humidity: { min: 90, max: 99 }, // Extremely humid swamp conditions
    ppfd: { max: 200 }, // Swamp shade
    biomes: ['marsh']
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [21, TimeUnit.DAY]
  },
  decay: {
    curve: 'LINEAR',
    duration: [30, TimeUnit.DAY] // Very long-lasting bracket fungi
  }
});

// Generalist Fungi - Can thrive across multiple biomes

// Oyster mushroom - extremely adaptable, found worldwide
export const OysterMushroomSchema: BulkResourceSchema = createFungusSchema({
  name: 'oyster mushroom',
  slug: 'oyster-mushroom',
  provides: ['mushroom', 'proteins'],
  requirements: {
    temperature: { min: 5, max: 35 }, // Very wide temperature range
    humidity: { min: 40, max: 95 }, // Can handle dry to very humid
    ppfd: { max: 600 }, // Can tolerate more light than most fungi
    seasons: ['spring', 'summer', 'fall'], // Three seasons
    time: ['dawn', 'morning', 'dusk'] // Flexible timing
  },
  growth: {
    curve: 'EXPONENTIAL', // Fast, aggressive growth
    duration: [4, TimeUnit.DAY]
  },
  constraints: {
    maxNeighbors: 4,      // Override: aggressive clustering
    inhibitionRadius: 1
  }
});

// Puffball - very adaptable, found in many environments
export const CommonPuffballSchema: BulkResourceSchema = createFungusSchema({
  name: 'puffball',
  slug: 'puffball',
  provides: ['mushroom', 'spores'],
  requirements: {
    temperature: { min: 10, max: 32 }, // Wide temperate range
    humidity: { min: 35, max: 85 }, // Broad humidity tolerance
    pressure: { min: 980, max: 1025 }, // Works at various altitudes
    ppfd: { max: 800 }, // Can handle open areas
    seasons: ['summer', 'fall'] // Extended growing season
  }
});

// Honey mushroom - aggressive parasite, very adaptable
export const HoneyMushroomSchema: BulkResourceSchema = createFungusSchema({
  name: 'honey mushroom',
  slug: 'honey-mushroom',
  provides: ['mushroom', 'honey'],
  requirements: {
    temperature: { min: 8, max: 30 }, // Broad temperate range
    humidity: { min: 45, max: 90 }, // Wide humidity tolerance
    ppfd: { max: 500 }, // Moderate light tolerance
    seasons: ['fall'] // Classic fall season but very reliable
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [5, TimeUnit.DAY] // Moderately fast growth
  },
  decay: {
    curve: 'LINEAR',
    duration: [5, TimeUnit.DAY] // Longer lasting than most
  }
});

// Specialist Fungi - Unique ecological niches

// Cordyceps gaeatrix - parasitic fungus described in our world concept
export const CordycepsGaeatrixSchema: BulkResourceSchema = createFungusSchema({
  name: 'gaeatrix',
  slug: 'gaeatrix',
  fitness: {
    strategy: FitnessEvaluationStrategy.FUNGUS,
    min: GOLDEN_RATIO,
  },
  requirements: {
    temperature: { min: 13, max: 28 }, // Forest temperate range
    humidity: { min: 65, max: 90 }, // High forest humidity
    biomes: ['forest']
  },
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfMeasure.EACH,
      min: 0,
      capacity: 1,
    }
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [1, TimeUnit.HOUR]
  },
  decay: {
    curve: 'LINEAR',
    duration: [1, TimeUnit.HOUR]
  }
});
