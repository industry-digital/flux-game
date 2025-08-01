import { UnitOfVolume, TimeUnit } from '~/types';
import { BulkResourceSchema } from '~/types/schema/resource';

// Helper function to create water body schemas with proper typing
function createWaterSchema(overrides: Partial<BulkResourceSchema>): BulkResourceSchema {
  return {
    kind: 'water',
    provides: ['water', 'mud'],
    quantification: {
      type: 'bulk',
      quantity: {
        measure: UnitOfVolume.LITERS,
        min: 0,
        capacity: 1_000 // Will be overridden
      }
    },
    requirements: {
      precipitation: { min: 1 }
    },
    growth: {
      curve: 'EASE_OUT_QUAD',
      duration: [1, TimeUnit.HOUR]
    },
    decay: {
      curve: 'EXPONENTIAL',
      duration: [1, TimeUnit.WEEK]
    },
    ...overrides
  } as BulkResourceSchema;
}

/**
 * Large puddle - ephemeral water collection
 * Forms after rain, evaporates quickly
 */
export const LargePuddleSchema: BulkResourceSchema = createWaterSchema({
  name: 'large puddle',
  slug: 'large-puddle',
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfVolume.LITERS,
      min: 0,
      capacity: 100 // 100 liters
    }
  },
  decay: {
    curve: 'EXPONENTIAL',
    duration: [1, TimeUnit.DAY]
  }
});

/**
 * Small pond - backyard koi pond scale
 * More resilient than puddles, supports simple aquatic life
 */
export const SmallPondSchema: BulkResourceSchema = createWaterSchema({
  name: 'small pond',
  slug: 'small-pond',
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfVolume.LITERS,
      min: 0,
      capacity: 5_000 // 5000 liters
    }
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [1, TimeUnit.WEEK]
  },
  decay: {
    curve: 'LOGISTIC',
    duration: [1, TimeUnit.YEAR]
  }
});

/**
 * Large pond - significant water feature
 * Stable ecosystem, takes substantial drought to affect
 */
export const LargePondSchema: BulkResourceSchema = createWaterSchema({
  name: 'large pond',
  slug: 'large-pond',
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfVolume.LITERS,
      min: 0,
      capacity: 25_000 // 25,000 liters
    }
  },
  requirements: {
    precipitation: { min: 3 }
  },
  growth: {
    curve: 'CUBIC',
    duration: [2, TimeUnit.WEEK]
  },
  decay: {
    curve: 'CUBIC',
    duration: [6, TimeUnit.WEEK]
  }
});

/**
 * Small lake - permanent water feature
 * Very stable, only extreme drought affects it
 */
export const SmallLakeSchema: BulkResourceSchema = createWaterSchema({
  name: 'small lake',
  slug: 'small-lake',
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfVolume.LITERS,
      min: 0,
      capacity: 100_000 // 100,000 liters
    }
  },
  growth: {
    curve: 'LINEAR',
    duration: [1, TimeUnit.DAY]
  },
  decay: {
    curve: 'EXPONENTIAL',
    duration: [3, TimeUnit.YEAR]
  }
});
