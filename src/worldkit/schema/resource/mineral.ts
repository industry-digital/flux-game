import { UnitOfMass, TimeUnit } from '~/types';
import { BulkResourceSchema } from '~/types/schema/resource';

// Helper function to create mineral schemas with proper typing
function createMineralSchema(overrides: Partial<BulkResourceSchema>): BulkResourceSchema {
  return {
    kind: 'mineral',
    provides: ['ore'],
    fitness: 0.618,
    quantification: {
      type: 'bulk',
      quantity: {
        measure: UnitOfMass.KILOGRAMS,
        min: 0,
        capacity: 3,
      }
    },
    requirements: {}, // Minerals require no specific conditions for growth
    growth: {
      curve: 'LINEAR',
      duration: [1, TimeUnit.DAY]
    },
    // Most minerals are territorial/exclusive
    constraints: {
      maxNeighbors: 0,      // Exclusive by default
      inhibitionRadius: 2   // Regional exclusion effect
    },
    ...overrides
  } as BulkResourceSchema;
}

// Base Metals for Steel Production

// Iron - Primary base metal for all steel
export const IronSchema: BulkResourceSchema = createMineralSchema({
  name: 'iron',
  slug: 'iron',
  provides: ['ore', 'iron'],
  requirements: {
    biomes: ['mountain', 'steppe']
  },
  constraints: {
    maxNeighbors: 1,      // Override: seam formation
    inhibitionRadius: 2
  }
});

// Carbon - Essential for steel hardening (coal/graphite deposits)
export const CoalSchema: BulkResourceSchema = createMineralSchema({
  name: 'coal',
  slug: 'coal',
  provides: ['ore', 'coal', 'carbon'],
  requirements: {
    biomes: ['marsh', 'jungle']
  },
  constraints: {
    maxNeighbors: 1,      // Override: seam formation
    inhibitionRadius: 2
  }
});

// Stainless Steel Alloys
export const ChromiumSchema: BulkResourceSchema = createMineralSchema({
  name: 'chromium',
  slug: 'chromium',
  provides: ['ore', 'chromium'],
  requirements: {
    biomes: ['steppe']
  }
});

export const NickelSchema: BulkResourceSchema = createMineralSchema({
  name: 'nickel',
  slug: 'nickel',
  provides: ['ore', 'nickel'],
  requirements: {
    biomes: ['mountain', 'grassland', 'steppe']
  }
});

// Tool and Weapon Steel Alloys

// Tungsten - High-temperature strength, cutting edges
export const TungstenSchema: BulkResourceSchema = createMineralSchema({
  name: 'tungsten',
  slug: 'tungsten',
  provides: ['ore', 'tungsten'],
  requirements: {
    biomes: ['mountain']
  }
});

export const MolybdenumSchema: BulkResourceSchema = createMineralSchema({
  name: 'molybdenum',
  slug: 'molybdenum',
  provides: ['ore', 'molybdenum'],
  requirements: {
    biomes: ['mountain', 'steppe']
  }
});

export const VanadiumSchema: BulkResourceSchema = createMineralSchema({
  name: 'vanadium',
  slug: 'vanadium',
  provides: ['ore', 'vanadium'],
  requirements: {
    biomes: ['mountain', 'grassland']
  }
});

// Structural Steel Components
export const ManganeseSchema: BulkResourceSchema = createMineralSchema({
  name: 'manganese',
  slug: 'manganese',
  provides: ['ore', 'manganese'],
  requirements: {
    biomes: ['grassland', 'marsh']
  }
});

// Silicon - Deoxidizer and steel strength
export const SiliconSchema: BulkResourceSchema = createMineralSchema({
  name: 'silicon',
  slug: 'silicon',
  provides: ['ore', 'silicon'],
  requirements: {
    biomes: ['steppe', 'grassland']
  }
});

// Specialty Metals

// Titanium - Lightweight, high-strength applications
export const TitaniumSchema: BulkResourceSchema = createMineralSchema({
  name: 'titanium',
  slug: 'titanium',
  provides: ['ore', 'titanium'],
  requirements: {
    biomes: ['mountain']
  }
});

// Cobalt - High-speed cutting tools
export const CobaltSchema: BulkResourceSchema = createMineralSchema({
  name: 'cobalt',
  slug: 'cobalt',
  provides: ['ore', 'cobalt'],
  requirements: {
    biomes: ['mountain', 'grassland']
  }
});

// Energy Storage

// Lithium - Battery technology
export const LithiumSchema: BulkResourceSchema = createMineralSchema({
  name: 'lithium',
  slug: 'lithium',
  provides: ['ore', 'lithium'],
  requirements: {
    biomes: ['mountain', 'steppe', 'grassland']
  }
});

// Piezoelectric Minerals

// Quartz - Most common piezoelectric material
export const QuartzSchema: BulkResourceSchema = createMineralSchema({
  name: 'quartz',
  slug: 'quartz',
  provides: ['ore', 'quartz'],
  requirements: {
    biomes: ['mountain', 'steppe', 'grassland', 'forest'] // Extremely widespread
  },
  constraints: {
    maxNeighbors: 2,      // Override: common clustering
    inhibitionRadius: 2
  }
});

// Tourmaline - Complex piezoelectric properties
export const TourmalineSchema: BulkResourceSchema = createMineralSchema({
  name: 'tourmaline',
  slug: 'tourmaline',
  provides: ['ore', 'tourmaline'],
  requirements: {
    biomes: ['mountain', 'forest']
  }
});

// Topaz - High-quality piezoelectric properties
export const TopazSchema: BulkResourceSchema = createMineralSchema({
  name: 'topaz',
  slug: 'topaz',
  provides: ['ore', 'topaz'],
  requirements: {
    biomes: ['mountain']
  }
});

// Beryl - Advanced piezoelectric applications
export const BerylSchema: BulkResourceSchema = createMineralSchema({
  name: 'beryl',
  slug: 'beryl',
  provides: ['ore', 'beryl'],
  requirements: {
    biomes: ['mountain', 'forest']
  }
});
