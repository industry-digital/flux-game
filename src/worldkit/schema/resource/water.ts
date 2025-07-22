import { UnitOfMeasure, TimeUnit } from '~/types';
import { ResourceSchema } from '~/types/schema/resource';
import { Easing } from '~/lib/easing';

/**
 * Factory function for creating water body resource schemas using a transformer approach
 */
function createWaterBodySchema(
  transform: (defaults: ResourceSchema) => ResourceSchema
): ResourceSchema {
  const defaults: Partial<ResourceSchema> = {

    // By default, all bodies of water require minimal precipitation to grow
    requirements: {
      precipitation: { min: 1  }
    },

    // By default, all bodies of water replenish in an hour, no matter their size
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
      measure: UnitOfMeasure.EACH,
      capacity: 1_000, // 1000 units = 1000 liters
    },

    // All bodies of water yield the same taxonomic atoms
    provides: ['water', 'mud'],

    description: (state) =>
      state.fullness > 0.7 ? "a body of water" :
      state.fullness > 0.3 ? "a shallow water body" : "a drying water bed"
  };

  return transform(defaults as ResourceSchema);
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
    capacity: 100 // 100 liters
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
    capacity: 5_000, // 5000 liters
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
    capacity: 25_000 // 25,000 liters
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
    capacity: 100_000 // 100,000 liters
  },
  description: (state) =>
    state.fullness > 0.9 ? "a pristine small lake reflecting the surrounding landscape" :
    state.fullness > 0.7 ? "a clear lake with marshy edges" :
    state.fullness > 0.4 ? "a receding lake with exposed shoreline" : "a shrinking lake bed"
}));
