import { UnitOfVolume, TimeUnit } from '~/types';
import { BulkResourceSchema } from '~/types/schema/resource';

// Helper function to create water body schemas with proper typing
function createWaterSchema(overrides: Partial<BulkResourceSchema>): BulkResourceSchema {
  return {
    kind: 'water',
    provides: ['water', 'mud'],
    rarity: 0.618,
    quantification: {
      type: 'bulk',
      quantity: {
        measure: UnitOfVolume.LITERS,
        min: 0,
        capacity: 1_000 // Will be overridden
      }
    },
    requirements: {
      precipitation: { min: 2 }
    },
    growth: {
      curve: 'EASE_OUT_QUAD',

      // By default, all bodies of water recharge completely in an hour
      duration: [1, TimeUnit.HOUR]
    },
    decay: {
      curve: 'EASE_OUT_QUAD',

      // By default, all bodies of water decay completely in a week
      duration: [3, TimeUnit.DAY]
    },
    // Water bodies are typically exclusive
    constraints: {
      maxNeighbors: 0,      // One water body per area
      inhibitionRadius: 1   // Immediate neighbors only
    },
    ...overrides
  } as BulkResourceSchema;
}

/**
 * Large puddle - ephemeral water collection
 * Forms after rain, evaporates quickly
 */
export const PuddleSchema: BulkResourceSchema = createWaterSchema({
  name: 'puddle',
  slug: 'puddle',
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfVolume.LITERS,
      min: 0,
      capacity: 3,
    }
  },
});

/**
 * Large pond - permanent water body
 * Deeper water that persists through dry seasons
 */
export const LargePondSchema: BulkResourceSchema = createWaterSchema({
  name: 'large pond',
  slug: 'large-pond',
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfVolume.LITERS,
      min: 100,
      capacity: 5_000,
    }
  },
  requirements: {
    precipitation: { min: 1 } // Less dependent on immediate rainfall
  },
  decay: {
    curve: 'EASE_OUT_QUAD',
    duration: [2, TimeUnit.WEEK] // Takes longer to dry up
  }
});
