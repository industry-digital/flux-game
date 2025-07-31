import { UnitOfMeasure, TimeUnit } from '~/types';
import { ResourceSchema } from '~/types/schema/resource';
import { Easing } from '~/types/easing';

export const createFungusSchema = (transform: (defaults: ResourceSchema) => ResourceSchema): ResourceSchema => {
  const defaults: Partial<ResourceSchema> = {
    provides: ['mushroom'],
    requirements: {
      temperature: { min: 10, max: 30 },
      humidity: { min: 50, max: 90 },
      ppfd: { max: 400 },
      time: ['dusk', 'night'],
    },
    // Fungi typically grow slowly over days to weeks
    growth: {
      curve: Easing.LOGISTIC,
      duration: [7, TimeUnit.DAY]
    },
    // Fungi decay quickly once harvested
    decay: {
      curve: Easing.EXPONENTIAL,
      duration: [3, TimeUnit.DAY]
    },
    // Fungi are counted individually, and are found as sparse patches
    quantity: {
      measure: UnitOfMeasure.EACH,
      min: 1,
      capacity: 11,
    },
    description: ({ fullness }, now, { name }) => {
      if (fullness >= 1) {
        return `a patch of ${name} mushroom thriving in the shadows`;
      }
      if (fullness > 0.7) {
        return `a cluster of ${name} mushroom`;
      }
      if (fullness > 0.3) {
        return `scattered ${name} mushroom`;
      }
      return `a few ${name} mushroom emerging`;
    },
  };

  return transform(defaults as ResourceSchema);
};

export const TruffleSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'truffle',
  slug: 'truffle',
  provides: [...defaults.provides, 'seeds'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 10, max: 30 },
    humidity: { min: 50, max: 90 },
    ppfd: { max: 400 },
    time: ['dusk', 'night'],
    lunar: ['full'],
  },
}));

// STEPPE/ARID - Desert fungi that emerge only after rare rains
export const DesertPuffballSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'desert puffball',
  provides: ['mushroom', 'spores'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 35 },
    humidity: { min: 35, max: 60 }, // Need higher humidity than typical desert
    precipitation: { min: 2.0 }, // Only after significant rainfall
    ppfd: { max: 200 }, // Very low light, sheltered spots
    seasons: ['spring'], // Brief spring emergence after winter rains
    climates: ['arid'],
  },
  growth: {
    curve: Easing.EXPONENTIAL, // Rapid emergence after rain
    duration: [2, TimeUnit.DAY]
  },
  decay: {
    curve: Easing.EXPONENTIAL, // Quick decay in harsh conditions
    duration: [1, TimeUnit.DAY]
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'scattered desert puffballs emerging from the rain-soaked earth';
    }
    return 'clusters of pale desert puffballs taking advantage of rare moisture';
  }
}));

// GRASSLAND/TEMPERATE - Classic meadow mushroom, autumn fruiting
export const MeadowMushroomSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'meadow mushroom',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 25 },
    humidity: { min: 50, max: 80 },
    ppfd: { max: 600 }, // Can handle more light in open grassland
    seasons: ['fall'], // Classic autumn mushroom season
    time: ['dawn', 'morning', 'dusk'], // Active during cooler parts of day
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'scattered meadow mushroom dotting the grassland';
    }
    return 'fairy rings of meadow mushroom appearing in the autumn grass';
  }
}));

// FOREST/TEMPERATE - Chanterelles, summer to fall, lunar dependent
export const ChanterelleSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'chanterelle',
  provides: [...defaults.provides, 'oils'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 13, max: 28 },
    humidity: { min: 65, max: 90 },
    ppfd: { max: 300 }, // Deep forest shade
    seasons: ['summer', 'fall'],
    time: ['dawn', 'dusk', 'night'],
    lunar: ['waxing', 'full'], // Peak during fuller moon phases
    biomes: ['forest'],
  },
  growth: {
    curve: Easing.LOGISTIC,
    duration: [10, TimeUnit.DAY] // Slower growth for premium mushroom
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'golden chanterelles hiding beneath the forest canopy';
    }
    return 'a treasure trove of golden chanterelles carpeting the forest floor';
  }
}));

// MOUNTAIN/ARID - Alpine fungi, very short season, cold-adapted
export const AlpineBoleteSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'alpine bolete',
  provides: [...defaults.provides, 'resins'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 2, max: 18 }, // Cold mountain conditions
    humidity: { min: 30, max: 50 }, // Lower humidity tolerance
    pressure: { min: 950, max: 990 }, // High altitude low pressure
    ppfd: { max: 800 }, // Can handle mountain sun when sheltered
    seasons: ['summer'], // Very brief growing season
    time: ['morning', 'day'], // Active during warmer daylight hours
    biomes: ['mountain'],
  },
  growth: {
    curve: Easing.LOGISTIC,
    duration: [14, TimeUnit.DAY] // Slow growth in harsh conditions
  },
  decay: {
    curve: Easing.LINEAR,
    duration: [7, TimeUnit.DAY] // Hardy, longer lasting
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'hardy alpine boletes clinging to the mountainside';
    }
    return 'robust alpine boletes thriving in the brief mountain summer';
  }
}));

// JUNGLE/TROPICAL - Exotic fungi, new moon dependent (darkness loving)
export const BloodRedCupSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'blood-red cup fungus',
  provides: [...defaults.provides, 'dyes'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 24, max: 35 },
    humidity: { min: 80, max: 98 },
    ppfd: { max: 100 }, // Very deep jungle shade
    seasons: ['spring', 'summer', 'fall'], // Year-round in tropics
    time: ['night'], // Strictly nocturnal
    lunar: ['new', 'waning'], // Prefers darker nights
    biomes: ['jungle'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'crimson cup fungi glowing faintly in the jungle darkness';
    }
    return 'brilliant blood-red cup fungi lighting up the jungle floor like fallen rubies';
  }
}));

// MARSH/TROPICAL - Bracket fungi on dead wood, seasonal but long-lasting
export const SwampBracketSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'swamp bracket',
  provides: [...defaults.provides, 'tinder', 'medicine'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 29 },
    humidity: { min: 90, max: 99 }, // Extremely humid swamp conditions
    ppfd: { max: 200 }, // Swamp shade
    seasons: ['winter', 'spring'], // Grows during cooler wet season
    time: ['dawn', 'morning', 'dusk'], // Avoids hot midday
    biomes: ['marsh'],
  },
  growth: {
    curve: Easing.LOGISTIC,
    duration: [21, TimeUnit.DAY]
  },
  decay: {
    curve: Easing.LINEAR,
    duration: [30, TimeUnit.DAY] // Very long-lasting bracket fungi
  },
  quantity: {
    measure: UnitOfMeasure.EACH,
    min: 1,
    capacity: 20 // Fewer but larger bracket fungi
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'woody swamp brackets forming on dead cypress trunks';
    }
    return 'massive swamp brackets creating shelves along the waterlogged trees';
  }
}));

// GENERALIST FUNGI - Can thrive across multiple biomes

// Oyster mushroom - extremely adaptable, found worldwide
export const OysterMushroomSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'oyster mushroom',
  provides: [...defaults.provides, 'proteins'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 35 }, // Very wide temperature range
    humidity: { min: 40, max: 95 }, // Can handle dry to very humid
    ppfd: { max: 600 }, // Can tolerate more light than most fungi
    seasons: ['spring', 'summer', 'fall'], // Three seasons
    time: ['dawn', 'morning', 'dusk'], // Flexible timing
  },
  growth: {
    curve: Easing.EXPONENTIAL, // Fast, aggressive growth
    duration: [4, TimeUnit.DAY]
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'hardy oyster mushrooms sprouting from dead wood';
    }
    return 'prolific clusters of oyster mushrooms cascading from fallen logs';
  }
}));

// Puffball - very adaptable, found in many environments
export const CommonPuffballSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'puffball',
  provides: [...defaults.provides, 'spores'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 10, max: 32 }, // Wide temperate range
    humidity: { min: 35, max: 85 }, // Broad humidity tolerance
    pressure: { min: 980, max: 1025 }, // Works at various altitudes
    ppfd: { max: 800 }, // Can handle open areas
    seasons: ['summer', 'fall'], // Extended growing season
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'scattered white puffballs dotting the landscape';
    }
    return 'numerous puffballs ready to release clouds of spores';
  }
}));

// Honey mushroom - aggressive parasite, very adaptable
export const HoneyMushroomSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'honey mushroom',
  provides: [...defaults.provides, 'honey'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 8, max: 30 }, // Broad temperate range
    humidity: { min: 45, max: 90 }, // Wide humidity tolerance
    ppfd: { max: 500 }, // Moderate light tolerance
    seasons: ['fall'], // Classic fall season but very reliable
  },
  growth: {
    curve: Easing.LOGISTIC,
    duration: [5, TimeUnit.DAY] // Moderately fast growth
  },
  decay: {
    curve: Easing.LINEAR,
    duration: [5, TimeUnit.DAY] // Longer lasting than most
  },
  quantity: {
    measure: UnitOfMeasure.EACH,
    min: 1,
    capacity: 75 // More prolific than average
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'golden honey mushrooms emerging from infected tree roots';
    }
    return 'abundant honey mushrooms carpeting the base of dying trees';
  }
}));

// SPECIALIST FUNGI - Unique ecological niches

// Cordyceps gaeatrix - parasitic fungus described in our world concept
export const CordycepsGaeatrixSchema = createFungusSchema((defaults) => ({
  ...defaults,
  name: 'gaeatrix',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 13, max: 28 }, // Forest temperate range
    humidity: { min: 65, max: 90 }, // High forest humidity
    seasons: ['spring', 'summer', 'fall'],
    time: ['night'],
    biomes: ['forest'],
  },
  growth: {
    curve: Easing.LOGISTIC,
    duration: [7, TimeUnit.DAY],
  },
  quantity: {
    measure: UnitOfMeasure.EACH,
    min: 1,
    capacity: 3,
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'eerie gaeatrix fungal stalks emerging from infected forest insects';
    }
    return 'otherworldly gaeatrix fungi sprouting from the forest floor, testament to nature\'s dark symbiosis';
  }
}));
