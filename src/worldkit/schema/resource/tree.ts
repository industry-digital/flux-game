import { UnitOfMeasure, TimeUnit } from '~/types';
import { BulkResourceSchema, FitnessEvaluationStrategy } from '~/types/schema/resource';



// Helper function to create tree schemas with proper typing
export function createTreeSchema(overrides: Partial<BulkResourceSchema> = {}): BulkResourceSchema {
  return {
    kind: 'tree',
    provides: ['wood', 'bark'],
    fitness: {
      strategy: FitnessEvaluationStrategy.PLANT,
      min: 0.382,
    },
    quantification: {
      type: 'bulk',
      quantity: {
        measure: UnitOfMeasure.EACH,
        min: 0,
        capacity: 3,
      }
    },
    requirements: {
      temperature: { min: 5, max: 35 },
      humidity: { min: 30, max: 90 },
      ppfd: { min: 200 },
      soils: {
        'loam:gravelly': 0.4,    // Ideal forest soil
        'clay:gravelly': 0.3,    // Good drainage, retains nutrients
        'silt:gravelly': 0.2,    // Prairie/grassland adaptation
        'loam:lithic': 0.1,      // Mountain adaptation
      },
    },
    growth: {
      curve: 'LOGISTIC',
      duration: [1, TimeUnit.DAY]
    },
    decay: {
      curve: 'LINEAR',
      duration: [1, TimeUnit.WEEK]
    },
    // Trees naturally form forests but need breathing room
    constraints: {
      maxNeighbors: 3,      // Forest clustering but not overcrowded
      inhibitionRadius: 1   // Local spacing only
    },
    ...overrides
  } as BulkResourceSchema;
}

// Desert/Arid Trees
export const MesquiteSchema: BulkResourceSchema = createTreeSchema({
  name: 'mesquite',
  slug: 'mesquite',
  provides: ['wood', 'bark', 'nectar'],
  requirements: {
    temperature: { min: 10, max: 45 },
    humidity: { min: 15, max: 60 },
    soils: {
      'sand:gravelly': 0.6,    // Desert/arid specialist
      'loam:gravelly': 0.3,    // Adaptable to better soils
      'sand:lithic': 0.1,      // Rocky desert tolerance
    },
  }
});

export const JuniperSchema: BulkResourceSchema = createTreeSchema({
  name: 'juniper',
  slug: 'juniper',
  provides: ['wood', 'bark', 'berries', 'resin'],
  requirements: {
    temperature: { min: 0, max: 40 },
    humidity: { min: 20, max: 70 },
  },
  placement: {
    soils: {
      'sand:lithic': 0.4,      // Mountain/rocky specialist
      'loam:lithic': 0.3,      // Mountain adaptation
      'clay:stony': 0.2,       // Rocky soil tolerance
      'sand:gravelly': 0.1,    // Some desert tolerance
    },
  }
});

// Grassland (Temperate) Trees - Prairie adapted, water-seeking
export const CottonwoodSchema: BulkResourceSchema = createTreeSchema({
  name: 'cottonwood',
  slug: 'cottonwood',
  provides: ['wood', 'bark', 'resin'],
  requirements: {
    temperature: { min: -5, max: 35 },
    humidity: { min: 40, max: 95 },
  },
  placement: {
    soils: {
      'silt:gravelly': 0.5,    // Prairie/riverbank specialist
      'loam:gravelly': 0.3,    // Good general soil
      'clay:gravelly': 0.2,    // Moisture retention
    },
  },
  constraints: {
    maxNeighbors: 4,      // Override: pioneer species clustering
    inhibitionRadius: 1
  }
});

export const BurOakSchema: BulkResourceSchema = createTreeSchema({
  name: 'bur oak',
  slug: 'bur-oak',
  provides: ['wood', 'bark', 'nuts'],
  requirements: {
    temperature: { min: -15, max: 35 },
    humidity: { min: 35, max: 80 },
  },
  placement: {
    soils: {
      'loam:gravelly': 0.4,    // Prairie oak specialist
      'silt:gravelly': 0.3,    // Prairie basin soils
      'clay:gravelly': 0.2,    // Moisture retention
      'sand:gravelly': 0.1,    // Some drought tolerance
    },
  }
});

// Forest (Temperate) Trees - Classic woodland species
export const MapleSchema: BulkResourceSchema = createTreeSchema({
  name: 'maple',
  slug: 'maple',
  provides: ['wood', 'bark', 'sap'],
  requirements: {
    temperature: { min: -15, max: 30 },
    humidity: { min: 45, max: 85 },
    soils: {
      'loam:gravelly': 0.5,    // Classic forest soil
      'clay:gravelly': 0.3,    // Rich, moist forest soil
      'silt:gravelly': 0.2,    // Forest edge adaptation
    },
  }
});

export const WhiteBirchSchema: BulkResourceSchema = createTreeSchema({
  name: 'white birch',
  slug: 'white-birch',
  provides: ['wood', 'bark', 'sap'],
  requirements: {
    temperature: { min: -20, max: 25 },
    humidity: { min: 40, max: 80 },
    soils: {
      'loam:gravelly': 0.4,    // Forest specialist
      'clay:gravelly': 0.3,    // Moist forest soil
      'silt:gravelly': 0.2,    // Pioneer species adaptability
      'sand:gravelly': 0.1,    // Some poor soil tolerance
    },
  }
});

export const WhitePineSchema: BulkResourceSchema = createTreeSchema({
  name: 'white pine',
  slug: 'white-pine',
  provides: ['wood', 'bark', 'resin', 'nuts'],
  requirements: {
    temperature: { min: -25, max: 25 },
    humidity: { min: 35, max: 80 },
    soils: {
      'loam:gravelly': 0.4,    // Forest specialist
      'clay:gravelly': 0.3,    // Rich forest soil
      'sand:gravelly': 0.2,    // Sandy soil tolerance
      'loam:lithic': 0.1,      // Some mountain tolerance
    },
  }
});

// Mountain (Arid) Trees - High altitude specialists
export const MountainPineSchema: BulkResourceSchema = createTreeSchema({
  name: 'mountain pine',
  slug: 'mountain-pine',
  provides: ['wood', 'bark', 'resin', 'nuts'],
  requirements: {
    temperature: { min: -30, max: 20 },
    humidity: { min: 25, max: 70 },
    soils: {
      'sand:lithic': 0.4,      // Mountain specialist
      'loam:lithic': 0.3,      // Mountain soils
      'clay:stony': 0.2,       // Rocky mountain soil
      'sand:gravelly': 0.1,    // Some arid tolerance
    },
  }
});

export const AspenSchema: BulkResourceSchema = createTreeSchema({
  name: 'aspen tree',
  slug: 'aspen-tree',
  requirements: {
    temperature: { min: -25, max: 25 },
    humidity: { min: 30, max: 75 },
    soils: {
      'loam:gravelly': 0.3,    // Forest adaptation
      'sand:lithic': 0.3,      // Mountain adaptation
      'clay:stony': 0.2,       // Rocky soil tolerance
      'silt:gravelly': 0.2,    // Pioneer species flexibility
    },
  }
});

// Jungle (Tropical) Trees - Diverse tropical species
export const MahoganySchema: BulkResourceSchema = createTreeSchema({
  name: 'mahogany',
  slug: 'mahogany',
  provides: ['wood', 'bark', 'seeds'],
  requirements: {
    temperature: { min: 20, max: 35 },
    humidity: { min: 70, max: 95 },
    soils: {
      'clay:stony': 0.6,       // Tropical jungle specialist
      'silt:gravelly': 0.3,    // Rich tropical soil
      'loam:gravelly': 0.1,    // Some adaptation
    },
  }
});

export const RubberTreeSchema: BulkResourceSchema = createTreeSchema({
  name: 'rubber',
  slug: 'rubber',
  provides: ['wood', 'bark', 'latex'],
  requirements: {
    temperature: { min: 22, max: 32 },
    humidity: { min: 75, max: 95 },
    soils: {
      'clay:stony': 0.7,       // Tropical specialist
      'silt:gravelly': 0.2,    // Rich organic soil
      'loam:gravelly': 0.1,    // Minimal adaptation
    },
  }
});

export const BreadfruitSchema: BulkResourceSchema = createTreeSchema({
  name: 'breadfruit',
  slug: 'breadfruit',
  provides: ['wood', 'bark', 'fruit'],
  requirements: {
    temperature: { min: 24, max: 35 },
    humidity: { min: 80, max: 100 },
    soils: {
      'clay:stony': 0.6,       // Tropical island specialist
      'silt:gravelly': 0.3,    // Rich volcanic soil
      'loam:gravelly': 0.1,    // Some general adaptation
    },
  }
});

// Marsh (Tropical) Trees - Wetland specialists
export const BaldCypressSchema: BulkResourceSchema = createTreeSchema({
  name: 'bald cypress',
  slug: 'bald-cypress',
  requirements: {
    temperature: { min: 15, max: 35 },
    humidity: { min: 85, max: 100 },
    soils: {
      'clay:stony': 0.4,       // Wetland specialist
      'silt:stony': 0.4,       // Marsh soils
      'clay:gravelly': 0.2,    // Some upland tolerance
    },
  }
});

export const MangroveSchema: BulkResourceSchema = createTreeSchema({
  name: 'mangrove',
  slug: 'mangrove',
  requirements: {
    temperature: { min: 20, max: 35 },
    humidity: { min: 90, max: 100 },
    soils: {
      'silt:stony': 0.6,       // Wetland/coastal specialist
      'clay:stony': 0.3,       // Muddy coastal soil
      'sand:gravelly': 0.1,    // Some coastal sand tolerance
    },
  }
});
