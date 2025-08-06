import { UnitOfVolume, TimeUnit } from '~/types';
import { BulkResourceSchema, FitnessEvaluationStrategy } from '~/types/schema/resource';

// Helper function to create water body schemas with proper typing
export function createWaterSchema(overrides: Partial<BulkResourceSchema> = {}): BulkResourceSchema {
  return {
    kind: 'water',
    provides: ['water', 'mud'],
    fitness: {
      strategy: FitnessEvaluationStrategy.PLANT,
      min: 0,
    },
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
