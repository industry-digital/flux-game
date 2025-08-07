import { UnitOfMass, TimeUnit } from '~/types';
import { BulkResourceSchema, FitnessEvaluationStrategy } from '~/types/schema/resource';

// Helper function to create mineral schemas with proper typing
export function createMineralSchema(overrides: Partial<BulkResourceSchema> = {}): BulkResourceSchema {
  return {
    kind: 'mineral',
    provides: ['ore'],
    fitness: {
      strategy: FitnessEvaluationStrategy.MINERAL,
      min: 0.4,
    },
    quantification: {
      type: 'bulk',
      quantity: {
        measure: UnitOfMass.KILOGRAMS,
        min: 0,
        capacity: 3,
      }
    },
    requirements: {
      bedrock: {
        'igneous:granite': 0.3,
        'sedimentary:shale': 0.3
      },
    }, // Minerals require no specific conditions for growth
    growth: {
      curve: 'LOGISTIC',
      duration: [1, TimeUnit.WEEK]
    },
    /**
     * Minerals don't decay, they are extracted from the ground
     * But they can be depleted by mining
     */
    decay: undefined,

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
  placement: {
    bedrock: {
      'sedimentary:limestone': 0.6,  // Banded iron formations
      'metamorphic:quartzite': 0.5,  // Taconite pellets
      'sedimentary:shale': 0.3,      // Iron-rich sediments
      'metamorphic:gneiss': 0.4      // Regional metamorphism
    },
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
  placement: {
    bedrock: {
      'sedimentary:shale': 0.7,      // Coal measures
      'sedimentary:limestone': 0.4   // Carboniferous sequences
    },
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
  placement: {
    bedrock: {
      'igneous:basalt': 0.7,         // Ultramafic complexes
      'metamorphic:gneiss': 0.4,     // High-grade metamorphism
      'igneous:granite': 0.5         // Granitic intrusions
    },
    biomes: ['steppe', 'jungle']
  }
});

export const NickelSchema: BulkResourceSchema = createMineralSchema({
  name: 'nickel',
  slug: 'nickel',
  provides: ['ore', 'nickel'],
  placement: {
    bedrock: {
      'igneous:basalt': 0.6,         // Ultramafic intrusions
      'metamorphic:gneiss': 0.5,     // Metamorphic complexes
      'sedimentary:limestone': 0.3   // Lateritic weathering
    },
    biomes: ['mountain', 'grassland', 'steppe']
  }
});

// Tool and Weapon Steel Alloys

// Tungsten - High-temperature strength, cutting edges
export const TungstenSchema: BulkResourceSchema = createMineralSchema({
  name: 'tungsten',
  slug: 'tungsten',
  provides: ['ore', 'tungsten'],
  placement: {
    bedrock: {
      'igneous:granite': 0.6,        // Granite pegmatites
      'metamorphic:schist': 0.5,     // Contact metamorphism
      'metamorphic:gneiss': 0.4      // High-grade metamorphism
    },
    biomes: ['mountain']
  }
});

export const MolybdenumSchema: BulkResourceSchema = createMineralSchema({
  name: 'molybdenum',
  slug: 'molybdenum',
  provides: ['ore', 'molybdenum'],
  placement: {
    bedrock: {
      'igneous:granite': 0.6,        // Porphyry deposits
      'metamorphic:quartzite': 0.4,  // Skarn deposits
      'metamorphic:gneiss': 0.5      // High-grade metamorphism
    },
    biomes: ['mountain', 'steppe']
  }
});

export const VanadiumSchema: BulkResourceSchema = createMineralSchema({
  name: 'vanadium',
  slug: 'vanadium',
  provides: ['ore', 'vanadium'],
  placement: {
    bedrock: {
      'igneous:basalt': 0.6,         // Titaniferous magnetite
      'sedimentary:shale': 0.5,      // Black shales
      'sedimentary:limestone': 0.3   // Carnotite deposits
    },
    biomes: ['mountain', 'grassland']
  }
});

// Structural Steel Components
export const ManganeseSchema: BulkResourceSchema = createMineralSchema({
  name: 'manganese',
  slug: 'manganese',
  provides: ['ore', 'manganese'],
  placement: {
    bedrock: {
      'sedimentary:limestone': 0.6,  // Marine deposits
      'metamorphic:marble': 0.5,     // Metamorphosed carbonates
      'sedimentary:shale': 0.4       // Black shale associations
    },
    biomes: ['grassland', 'marsh']
  }
});

// Silicon - Deoxidizer and steel strength
export const SiliconSchema: BulkResourceSchema = createMineralSchema({
  name: 'silicon',
  slug: 'silicon',
  provides: ['ore', 'silicon'],
  placement: {
    bedrock: {
      'metamorphic:quartzite': 0.7,  // High-purity quartz
      'igneous:granite': 0.5,        // Quartz-rich granites
      'sedimentary:limestone': 0.3,  // Silica replacement
      'metamorphic:gneiss': 0.4      // Regional metamorphism
    },
    biomes: ['steppe', 'grassland', 'mountain']
  }
});

// Specialty Metals

// Titanium - Lightweight, high-strength applications
export const TitaniumSchema: BulkResourceSchema = createMineralSchema({
  name: 'titanium',
  slug: 'titanium',
  provides: ['ore', 'titanium'],
  placement: {
    bedrock: {
      'igneous:basalt': 0.6,         // Ilmenite in mafic rocks
      'sedimentary:limestone': 0.4,  // Heavy mineral sands
      'igneous:granite': 0.3         // Accessory minerals
    },
    biomes: ['mountain']
  }
});

// Cobalt - High-speed cutting tools
export const CobaltSchema: BulkResourceSchema = createMineralSchema({
  name: 'cobalt',
  slug: 'cobalt',
  provides: ['ore', 'cobalt'],
  placement: {
    bedrock: {
      'igneous:basalt': 0.6,         // Ultramafic associations
      'metamorphic:gneiss': 0.4,     // Metamorphic complexes
      'sedimentary:shale': 0.3       // Sedimentary copper-cobalt
    },
    biomes: ['mountain', 'grassland']
  }
});

// Energy Storage

// Lithium - Battery technology
export const LithiumSchema: BulkResourceSchema = createMineralSchema({
  name: 'lithium',
  slug: 'lithium',
  provides: ['ore', 'lithium'],
  placement: {
    bedrock: {
      'igneous:granite': 0.7,        // Granite pegmatites
      'sedimentary:limestone': 0.4,  // Lithium brines
      'metamorphic:schist': 0.3,     // Spodumene deposits
      'metamorphic:gneiss': 0.5      // Regional metamorphism
    },
    biomes: ['mountain', 'steppe', 'grassland']
  }
});

// Piezoelectric Minerals

// Quartz - Most common piezoelectric material
export const QuartzSchema: BulkResourceSchema = createMineralSchema({
  name: 'quartz',
  slug: 'quartz',
  provides: ['gem', 'quartz'],
  placement: {
    bedrock: {
      'igneous:granite': 0.6,        // Primary host - granite pegmatites
      'metamorphic:quartzite': 0.5,  // Metamorphic quartz veins
      'sedimentary:limestone': 0.3,  // Hydrothermal replacement
      'metamorphic:gneiss': 0.4      // Regional metamorphism
    },
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
  provides: ['gem', 'tourmaline'],
  placement: {
    bedrock: {
      'igneous:granite': 0.6,        // Granite pegmatites
      'metamorphic:schist': 0.5,     // Metamorphic associations
      'metamorphic:gneiss': 0.4      // High-grade metamorphism
    },
    biomes: ['mountain', 'forest']
  }
});

// Topaz - High-quality piezoelectric properties
export const TopazSchema: BulkResourceSchema = createMineralSchema({
  name: 'topaz',
  slug: 'topaz',
  provides: ['gem', 'topaz'],
  placement: {
    bedrock: {
      'igneous:granite': 0.7,        // Granite pegmatites
      'metamorphic:quartzite': 0.4,  // High-temperature metamorphism
      'metamorphic:schist': 0.3      // Contact metamorphism
    },
    biomes: ['mountain']
  }
});

// Beryl - Advanced piezoelectric applications
export const BerylSchema: BulkResourceSchema = createMineralSchema({
  name: 'beryl',
  slug: 'beryl',
  provides: ['gem', 'beryl'],
  placement: {
    bedrock: {
      'igneous:granite': 0.7,        // Granite pegmatites
      'metamorphic:schist': 0.4,     // Mica schists
      'metamorphic:gneiss': 0.3      // Regional metamorphism
    },
    biomes: ['mountain', 'forest']
  }
});
