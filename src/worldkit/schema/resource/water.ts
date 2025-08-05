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

      // By default, all bodies of water recharge completely in an hour
      duration: [1, TimeUnit.HOUR]
    },
    decay: {
      curve: 'EASE_OUT_QUAD',

      // By default, all bodies of water decay completely in a week
      duration: [1, TimeUnit.WEEK]
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
