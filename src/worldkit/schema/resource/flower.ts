import { UnitOfMeasure, TimeUnit } from '~/types';
import { ResourceSchema } from '~/types/schema/resource';
import { Easing } from '~/lib/easing';

/**
 * Factory function for creating flower resource schemas
 * @param transform - A function that maps the supplied defaults into a new schema
 */
function createFlowerSchema(
  transform: (defaults: ResourceSchema) => ResourceSchema
): ResourceSchema {
  const defaults: ResourceSchema = {
    name: 'flower',

    // By default, all flowers yield nectar
    provides: ['flower', 'nectar'],

    // By default, flowers need moderate conditions to grow
    requirements: {
      temperature: { min: 5, max: 35 },
      humidity: { min: 30, max: 80 },
      ppfd: { min: 400 },
      seasons: ['spring', 'summer'],
      time: ['morning', 'day', 'afternoon']
    },

    // By default, flowers bloom over a few days with logistic growth
    growth: {
      curve: Easing.LOGISTIC,
      duration: [3, TimeUnit.DAY]
    },

    // By default, flowers wither over a week with exponential decay
    decay: {
      curve: Easing.EXPONENTIAL,
      duration: [1, TimeUnit.WEEK]
    },

    // Flowers are counted individually, up to 100 per patch
    quantity: {
      measure: UnitOfMeasure.EACH,
      min: 1,
      capacity: 100
    },


    description: ({ fullness }, now, { name }) => {
      if (fullness >= 1) {
        return `a patch of ${name} flowers, popping with vibrant color`;
      }
      if (fullness > 0.7) {
        return `a patch of ${name} flowers, in full bloom`;
      }
      if (fullness > 0.3) {
        return `a patch of ${name} flowers`;
      }
      return `a few scattered ${name} flowers`;
    },
  };

  return transform(defaults);
}

export const DesertMarigoldSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'desert marigold',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 35 },
    humidity: { min: 15, max: 45 },
    ppfd: { min: 1_200 },
    seasons: ['spring', 'summer'],
    time: ['morning', 'day', 'afternoon']
  },
}));

export const WildBergamotSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'wild bergamot',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 85 },
    ppfd: { min: 300 },
    seasons: ['summer', 'fall'],
    time: ['dawn', 'morning', 'day', 'afternoon', 'evening']
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'a scattered patch of wild bergamot along the forest edge';
    }
    if (state.fullness < 0.8) {
      return 'clusters of wild bergamot blooming where forest meets grassland';
    }
    return 'a meadow filled with fragrant wild bergamot, buzzing with activity';
  }
}));

// Temperate Grassland Flowers

export const PurpleConeflowerSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'purple coneflower',
  provides: [...defaults.provides, 'seed'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 70 },
    ppfd: { min: 600 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon']
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'scattered purple coneflowers dotting the grassland';
    }
    if (state.fullness > 0.8) {
      return 'a prairie alive with purple coneflowers swaying in the wind';
    }
    return 'clusters of purple coneflowers standing tall in the grass';
  }
}));

export const BlackEyedSusanSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'black-eyed susan',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 70 },
    ppfd: { min: 800 },
    seasons: ['summer'],
    time: ['morning', 'day', 'afternoon']
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'sparse black-eyed susans scattered through the grassland';
    }
    return 'golden black-eyed susans painting the prairie with color';
  }
}));

// Forest/Mountain Ecotone Flowers

export const WildColumbineSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'wild columbine',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 0, max: 30 },
    humidity: { min: 10, max: 85 },
    ppfd: { min: 200 },
    seasons: ['spring', 'summer'],
    time: ['dawn', 'morning', 'day']
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'delicate wild columbines hiding in the mountain shadows';
    }
    return 'elegant wild columbines dancing in the mountain breeze';
  }
}));

export const FireweedSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'fireweed',
  provides: [...defaults.provides, 'fiber'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 0, max: 30 },
    humidity: { min: 10, max: 85 },
    ppfd: { min: 300 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon', 'evening']
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'sparse fireweed flowers colonizing the mountain clearing';
    }
    return 'tall spikes of magenta fireweed flowers claiming the mountainside';
  }
}));

// Mountain/Jungle Ecotone Flowers

export const MountainPassionVineSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'mountain passion vine',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 20, max: 25 },
    humidity: { min: 35, max: 95 },
    ppfd: { min: 400 },
    seasons: ['spring', 'summer', 'fall'],
    time: ['day', 'afternoon'],
    biomes: ['mountain'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'passion vines with scattered blooms climbing the mountain slopes';
    }
    return 'passion vines heavy with exotic flowers cascading down the mountainside';
  }
}));

export const TropicalGingerSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'tropical ginger',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 18 },
    humidity: { min: 60 },
    ppfd: { min: 100 },
    seasons: ['spring', 'summer'],
    time: ['dawn', 'morning', 'day'],
    lunar: ['waxing', 'full']
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'wild ginger flowers emerging from the jungle undergrowth';
    }
    return 'vibrant ginger flowers lighting up the tropical mountain forest';
  }
}));

// Forest + Mountain ecotone
export const WildTrilliumSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'wild trillium',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 10 },
    humidity: { min: 50, max: 90 },
    ppfd: { min: 100 },
    time: ['dawn', 'morning', 'day'],
    biomes: ['forest', 'mountain'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'scattered white trilliums hiding beneath the forest canopy';
    }
    return 'carpets of wild trilliums blanketing the forest floor';
  }
}));

// Pure Ecosystem Flowers

// Mountain (Arid)
export const AlpineAsterSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'alpine aster',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 0, max: 25 },
    humidity: { min: 10, max: 35 },
    ppfd: { min: 800 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon']
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'hardy alpine asters clinging to the rocky mountainside';
    }
    return 'brilliant purple asters defying the harsh mountain winds';
  }
}));

// Jungle (Tropical)
export const JungleOrchidSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'orchid',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 20, max: 35 },
    humidity: { min: 75, max: 95 },
    ppfd: { min: 100, max: 600 },
    seasons: ['spring', 'summer', 'fall'],
    time: ['dawn', 'morning'],
    lunar: ['new', 'waxing']
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'rare orchids blooming high in the jungle canopy';
    }
    return 'spectacular orchids cascading from every tree in the humid jungle';
  }
}));

// Marsh (Tropical)
export const WaterLilySchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'water lily',
  provides: [...defaults.provides, 'roots'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 10, max: 30 },
    humidity: { min: 85, max: 100 },
    ppfd: { min: 400 },
    seasons: ['summer'],
    time: ['morning', 'day', 'afternoon']
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'scattered water lilies floating on the marsh surface';
    }
    return 'pristine water lilies covering the marsh in a blanket of white blooms';
  }
}));

// Additional Ecotone Flowers

// Steppe/Grassland Ecotone
export const PrairieRoseSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'prairie rose',
  provides: [...defaults.provides, 'fruit'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 8, max: 33 },
    humidity: { min: 25, max: 60 },
    ppfd: { min: 600 },
    seasons: ['spring', 'summer'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'wild roses scattered along the grassland edge';
    }
    return 'thorny prairie roses forming hedgerows along rocky outcrops';
  }
}));

// Steppe/Mountain Ecotone
export const DesertLupineSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'desert lupine',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 30 },
    humidity: { min: 15, max: 40 },
    ppfd: { min: 800 },
    seasons: ['spring'],
    time: ['morning', 'day', 'afternoon']
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'resilient lupines dotting the transition from desert to mountain';
    }
    return 'tall spikes of desert lupines marking the mountain foothills';
  }
}));

// Grassland/Mountain Ecotone
export const MountainSunflowerSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'mountain sunflower',
  provides: [...defaults.provides, 'seeds'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 2, max: 28 },
    humidity: { min: 30, max: 60 },
    ppfd: { min: 700 },
    seasons: ['summer', 'fall'],
    time: ['morning', 'day', 'afternoon']
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'wild sunflowers turning toward the mountain peaks';
    }
    return 'golden sunflowers following the sun across mountain meadows';
  }
}));

// Forest/Jungle Ecotone
export const BlackLotusSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'black lotus',
  provides: [...defaults.provides, 'nectar', 'seeds', 'roots'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 32 },
    humidity: { min: 60, max: 90 },
    ppfd: { max: 200 },
    seasons: ['spring', 'summer', 'fall'],
    lunar: ['full'], // Only during full moon
  },
  description: (state) => {
    return 'a few black lotus flowers clinging to the forest floor';
  }
}));

// Jungle/Marsh Ecotone
export const SwampOrchidSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: 'swamp orchid',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 32 },
    humidity: { min: 80, max: 98 },
    seasons: ['spring', 'summer'],
    time: ['dusk', 'night'],
    lunar: ['full'], // Only during full moon
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'exotic swamp orchids emerging from the misty wetland edge';
    }
    return 'ethereal swamp orchids floating above the steamy jungle marsh';
  }
}));
