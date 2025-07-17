import { UnitOfMeasure, TimeUnit } from '~/types';
import { ResourceSchema } from '~/types/schema/resource';
import { Easing } from '~/lib/easing';

/**
 * Factory function for creating flower resource schemas using a transformer approach
 */
function createFlowerSchema(
  transform: (defaults: ResourceSchema) => ResourceSchema
): ResourceSchema {
  const defaults: ResourceSchema = {
    name: "flower",

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

    // By default, all flowers yield nectar
    yields: {
      "nectar": (state) => "sweet flower nectar"
    },

    description: (state) =>
      state.fullness > 0.7 ? "a vibrant flower patch in full bloom" :
      state.fullness > 0.3 ? "a modest flower patch" : "a few scattered flowers"
  };

  return transform(defaults);
}

export const DesertMarigoldSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: { singular: 'desert marigold', plural: 'desert marigolds' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 35 },
    humidity: { min: 15, max: 45 },
    ppfd: { min: 1_200 },
    seasons: ['spring', 'summer'],
    time: ['morning', 'day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "sweet desert marigold nectar"
  },
  description: (state) => {
    const name = typeof defaults.name === 'string' ? defaults.name : defaults.name.singular;
    if (state.fullness < 0.5) {
      return `a sparse meadow of ${name}`;
    }
    return `a field filled with desert marigolds, dancing in the breeze`;
  }
}));

export const WildBergamotSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: { singular: 'wild bergamot', plural: 'wild bergamot' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 85 },
    ppfd: { min: 300 },
    seasons: ['summer', 'fall'],
    time: ['dawn', 'morning', 'day', 'afternoon', 'evening']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "wild bergamot nectar",
    "herb": (state) => "wild bergamot leaves",
    "seed": (state) => "wild bergamot seeds"
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
  name: { singular: 'purple coneflower', plural: 'purple coneflowers' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 70 },
    ppfd: { min: 600 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "purple coneflower nectar",
    "seed": (state) => "purple coneflower seeds",
    "medicine": (state) => "purple coneflower extract"
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
  name: { singular: 'black-eyed susan', plural: 'black-eyed susans' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 70 },
    ppfd: { min: 800 },
    seasons: ['summer'],
    time: ['morning', 'day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "black-eyed susan nectar",
    "seed": (state) => "black-eyed susan seeds",
    "dye": (state) => "golden yellow dye"
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
  name: { singular: 'wild columbine', plural: 'wild columbines' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 0, max: 30 },
    humidity: { min: 10, max: 85 },
    ppfd: { min: 200 },
    seasons: ['spring', 'summer'],
    time: ['dawn', 'morning', 'day']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "delicate columbine nectar",
    "seed": (state) => "wild columbine seeds",
    "ornamental": (state) => "elegant columbine flowers"
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
  name: { singular: 'fireweed', plural: 'fireweed' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 0, max: 30 },
    humidity: { min: 10, max: 85 },
    ppfd: { min: 300 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon', 'evening']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "fireweed honey nectar",
    "herb": (state) => "fireweed tea leaves",
    "seed": (state) => "fireweed down seeds"
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'sparse fireweed colonizing the mountain clearing';
    }
    return 'tall spikes of magenta fireweed claiming the mountainside';
  }
}));

// Mountain/Jungle Ecotone Flowers

export const MountainPassionVineSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: { singular: 'mountain passion vine', plural: 'mountain passion vines' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 20, max: 25 },
    humidity: { min: 35, max: 95 },
    ppfd: { min: 400 },
    seasons: ['spring', 'summer', 'fall'],
    time: ['day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "exotic passion flower nectar",
    "fruit": (state) => "small passion fruits",
    "vine": (state) => "strong passion vine fiber"
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
  name: { singular: 'tropical ginger', plural: 'tropical ginger' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 18 },
    humidity: { min: 60 },
    ppfd: { min: 100 },
    seasons: ['spring', 'summer'],
    time: ['dawn', 'morning', 'day'],
    lunar: ['waxing', 'full']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "spicy ginger flower nectar",
    "spice": (state) => "fresh ginger root",
    "medicine": (state) => "ginger medicinal extract"
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'wild ginger flowers emerging from the jungle undergrowth';
    }
    return 'vibrant ginger flowers lighting up the tropical mountain forest';
  }
}));

// Pure Ecosystem Flowers

// Forest (Temperate)
export const WildTrilliumSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: { singular: 'wild trillium', plural: 'wild trillium' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 10, max: 30 },
    humidity: { min: 55, max: 85 },
    ppfd: { min: 100, max: 400 },
    seasons: ['spring'],
    time: ['dawn', 'morning', 'day']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "delicate trillium nectar",
    "medicine": (state) => "trillium medicinal extract",
    "ornamental": (state) => "pristine white trillium flowers"
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'scattered white trilliums hiding beneath the forest canopy';
    }
    return 'carpets of wild trilliums blanketing the forest floor';
  }
}));

// Mountain (Arid)
export const AlpineAsterSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: { singular: 'alpine aster', plural: 'alpine asters' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 0, max: 25 },
    humidity: { min: 10, max: 35 },
    ppfd: { min: 800 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "hardy alpine nectar",
    "seed": (state) => "alpine aster seeds",
    "ornamental": (state) => "brilliant purple aster flowers"
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
  name: { singular: 'jungle orchid', plural: 'jungle orchids' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 20, max: 35 },
    humidity: { min: 75, max: 95 },
    ppfd: { min: 100, max: 600 },
    seasons: ['spring', 'summer', 'fall'],
    time: ['dawn', 'morning'],
    lunar: ['new', 'waxing']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "exotic jungle orchid nectar",
    "ornamental": (state) => "spectacular orchid blooms",
    "fragrance": (state) => "intoxicating orchid perfume"
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
  name: { singular: 'water lily', plural: 'water lilies' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 10, max: 30 },
    humidity: { min: 85, max: 100 },
    ppfd: { min: 400 },
    seasons: ['summer'],
    time: ['morning', 'day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "pure water lily nectar",
    "seed": (state) => "water lily seeds",
    "ornamental": (state) => "pristine white water lily blooms"
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
  name: { singular: 'prairie rose', plural: 'prairie roses' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 8, max: 33 },
    humidity: { min: 25, max: 60 },
    ppfd: { min: 600 },
    seasons: ['spring', 'summer'],
    time: ['dawn', 'morning', 'day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "wild rose nectar",
    "hips": (state) => "vitamin-rich rose hips",
    "ornamental": (state) => "delicate pink prairie roses"
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'wild roses scattered along the grassland edge';
    }
    return 'thorny prairie roses forming hedgerows between steppe and grassland';
  }
}));

// Steppe/Mountain Ecotone
export const DesertLupineSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: { singular: 'desert lupine', plural: 'desert lupine' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 5, max: 30 },
    humidity: { min: 15, max: 40 },
    ppfd: { min: 800 },
    seasons: ['spring'],
    time: ['morning', 'day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "desert lupine nectar",
    "seed": (state) => "protein-rich lupine seeds",
    "medicine": (state) => "lupine herbal extract"
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
  name: { singular: 'mountain sunflower', plural: 'mountain sunflowers' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 2, max: 28 },
    humidity: { min: 30, max: 60 },
    ppfd: { min: 700 },
    seasons: ['summer', 'fall'],
    time: ['morning', 'day', 'afternoon']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "mountain sunflower nectar",
    "seed": (state) => "oil-rich sunflower seeds",
    "oil": (state) => "golden sunflower oil"
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'wild sunflowers turning toward the mountain peaks';
    }
    return 'golden sunflowers following the sun across mountain meadows';
  }
}));

// Forest/Jungle Ecotone
export const TropicalHibiscusSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: { singular: 'tropical hibiscus', plural: 'tropical hibiscus' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 32 },
    humidity: { min: 60, max: 90 },
    ppfd: { min: 300, max: 800 },
    seasons: ['spring', 'summer', 'fall'],
    time: ['day', 'afternoon', 'evening']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "tropical hibiscus nectar",
    "dye": (state) => "vibrant red hibiscus dye",
    "ornamental": (state) => "massive hibiscus flowers"
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'vibrant hibiscus blooms scattered where forest meets jungle';
    }
    return 'massive hibiscus flowers creating a wall of color at the jungle edge';
  }
}));

// Jungle/Marsh Ecotone
export const SwampOrchidSchema = createFlowerSchema((defaults) => ({
  ...defaults,
  name: { singular: 'swamp orchid', plural: 'swamp orchids' },
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 32 },
    humidity: { min: 80, max: 98 },
    ppfd: { min: 200, max: 500 },
    seasons: ['spring', 'summer'],
    time: ['dusk', 'night'],
    lunar: ['full']
  },
  yields: {
    ...defaults.yields,
    "nectar": (state) => "mysterious swamp orchid nectar",
    "medicine": (state) => "potent swamp orchid extract",
    "ornamental": (state) => "ethereal swamp orchid blooms"
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'exotic swamp orchids emerging from the misty wetland edge';
    }
    return 'ethereal swamp orchids floating above the steamy jungle marsh';
  }
}));
