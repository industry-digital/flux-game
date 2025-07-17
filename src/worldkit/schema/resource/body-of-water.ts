import { UnitOfMeasure, TimeUnit } from '~/types';
import { ResourceSchema } from '~/types/schema/resource';
import { Easing } from '~/lib/easing';

/**
 * Factory function for creating water body resource schemas using a transformer approach
 */
function createWaterBodySchema(
  transform: (defaults: ResourceSchema) => ResourceSchema
): ResourceSchema {
  const defaults: ResourceSchema = {
    name: "water body",

    // By default, all bodies of water require minimal precipitation to grow
    requirements: {
      precipitation: { min: 1  }
    },

    // By default,. all bodies of water replenish in an hour
    growth: {
      curve: Easing.EASE_OUT_QUAD,
      duration: [1, TimeUnit.HOUR]
    },

    // By default, all bodies of water evaporate in a week. Evaporation starts slow,
    // then accelerates.
    decay: {
      curve: Easing.EXPONENTIAL,
      duration: [1, TimeUnit.WEEK]
    },

    // About the size of a small koi pond
    quantity: {
      measure: UnitOfMeasure.VOLUME_LITER,
      capacity: 1_000,
    },

    // By default, all bodies of water yield water and mud
    yields: {
      "water": (state) => "water",
      "mud": (state) => "mud"
    },

    description: (state) =>
      state.fullness > 0.7 ? "a body of water" :
      state.fullness > 0.3 ? "a shallow water body" : "a drying water bed"
  };

  return transform(defaults);
}

/**
 * Large puddle - ephemeral water collection
 * Forms after rain, evaporates quickly
 */
export const LargePuddleSchema: ResourceSchema = createWaterBodySchema(defaults => ({
  ...defaults,
  name: "large puddle",

  // Puddles evaporate quickly
  decay: {
    ...defaults.decay,
    duration: [1, TimeUnit.DAY]
  },

  quantity: {
    ...defaults.quantity,
    capacity: 100
  },

  description: (state) =>
    state.fullness > 0.7 ? "a large puddle reflecting the sky" :
    state.fullness > 0.3 ? "a shallow puddle" : "a muddy depression"
}));

/**
 * Small pond - backyard koi pond scale
 * More resilient than puddles, supports simple aquatic life
 */
export const SmallPondSchema: ResourceSchema = createWaterBodySchema(defaults => ({
  ...defaults,
  name: "small pond",
  growth: {
    curve: Easing.LOGISTIC,
    duration: [1, TimeUnit.WEEK]
  },
  decay: {
    curve: Easing.LOGISTIC,
    duration: [1, TimeUnit.YEAR],
  },
  quantity: {
    ...defaults.quantity,
    capacity: 5_000,
  },
  description: (state) =>
    state.fullness > 0.8 ? "a small pond dotted with lily pads" :
    state.fullness > 0.4 ? "a small pond with exposed edges" : "a shrinking pond"
}));

/**
 * Large pond - significant water feature
 * Stable ecosystem, takes substantial drought to affect
 */
export const LargePondSchema: ResourceSchema = createWaterBodySchema(defaults => ({
  ...defaults,
  name: "large pond",
  requirements: {
    ...defaults.requirements,
    precipitation: { min: 3 }
  },
  growth: {
    curve: Easing.QUADRATIC,
    duration: [2, TimeUnit.WEEK]
  },
  decay: {
    curve: Easing.CUBIC,
    duration: [6, TimeUnit.WEEK]
  },
  quantity: {
    ...defaults.quantity,
    capacity: 25000
  },
  yields: {
    ...defaults.yields,
    "water": (state) => "deep pond water",
    "algae": (state) => "rich pond algae",
    "lily_pad": (state) => state.fullness > 0.6 ? "floating lily pads" : "dried lily pad remnants",
    "cattail": (state) => state.fullness > 0.4 ? "tall cattails" : "brown cattail stalks",
    "pond_weed": (state) => "submerged pond vegetation"
  },
  description: (state) =>
    state.fullness > 0.9 ? "a large pond teeming with life" :
    state.fullness > 0.6 ? "a substantial pond with cattails at the edges" :
    state.fullness > 0.3 ? "a large pond with muddy shallows" : "a drying pond bed"
}));

/**
 * Small lake - permanent water feature
 * Very stable, only extreme drought affects it
 */
export const SmallLakeSchema: ResourceSchema = createWaterBodySchema(defaults => ({
  ...defaults,
  name: "small lake",
  requirements: {
    ...defaults.requirements,
    precipitation: { min: 1 }
  },
  growth: {
    curve: Easing.LINEAR,
    duration: [1, TimeUnit.DAY]
  },
  decay: {
    curve: (t) => t <= 0.7 ? 0.1 * t : Math.exp(3 * (t - 0.7)),
    duration: [3, TimeUnit.YEAR],
  },
  quantity: {
    ...defaults.quantity,
    capacity: 100000
  },
  yields: {
    ...defaults.yields,
    "water": (state) => "pristine lake water",
    "algae": (state) => "diverse lake algae",
    "lily_pad": (state) => "expansive lily pad beds",
    "cattail": (state) => "dense cattail marshes",
    "pond_weed": (state) => "varied aquatic plants",
    "fish": (state) => state.fullness > 0.7 ? "small lake fish" : "scattered fish bones",
    "smooth_stone": (state) => "lake-polished stones"
  },
  description: (state) =>
    state.fullness > 0.9 ? "a pristine small lake reflecting the surrounding landscape" :
    state.fullness > 0.7 ? "a clear lake with marshy edges" :
    state.fullness > 0.4 ? "a receding lake with exposed shoreline" : "a shrinking lake bed"
}));
