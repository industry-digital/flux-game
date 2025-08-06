import { UnitOfMeasure, TimeUnit } from '~/types';
import { BulkResourceSchema, FitnessType } from '~/types/schema/resource';



// Helper function to create tree schemas with proper typing
function createTreeSchema(overrides: Partial<BulkResourceSchema>): BulkResourceSchema {
  return {
    kind: 'tree',
    provides: ['wood', 'bark'],
    fitness: {
      type: FitnessType.ATMOSPHERIC,
      min: 0,
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
    seasons: ['spring', 'summer', 'fall']
  }
});

export const JuniperSchema: BulkResourceSchema = createTreeSchema({
  name: 'juniper',
  slug: 'juniper',
  provides: ['wood', 'bark', 'berries', 'resin'],
  requirements: {
    temperature: { min: 0, max: 40 },
    humidity: { min: 20, max: 70 },
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
    seasons: ['spring', 'summer', 'fall']
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
    seasons: ['spring', 'summer', 'fall']
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
    seasons: ['spring', 'summer', 'fall']
  }
});

export const WhiteBirchSchema: BulkResourceSchema = createTreeSchema({
  name: 'white birch',
  slug: 'white-birch',
  provides: ['wood', 'bark', 'sap'],
  requirements: {
    temperature: { min: -20, max: 25 },
    humidity: { min: 40, max: 80 },
  }
});

export const WhitePineSchema: BulkResourceSchema = createTreeSchema({
  name: 'white pine',
  slug: 'white-pine',
  provides: ['wood', 'bark', 'resin', 'nuts'],
  requirements: {
    temperature: { min: -25, max: 25 },
    humidity: { min: 35, max: 80 },
    seasons: ['spring', 'summer', 'fall', 'winter'] // Evergreen
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
    seasons: ['spring', 'summer', 'fall', 'winter']
  }
});

export const AspenSchema: BulkResourceSchema = createTreeSchema({
  name: 'aspen tree',
  slug: 'aspen-tree',
  requirements: {
    temperature: { min: -25, max: 25 },
    humidity: { min: 30, max: 75 },
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
    seasons: ['spring', 'summer', 'fall']
  }
});

export const RubberTreeSchema: BulkResourceSchema = createTreeSchema({
  name: 'rubber',
  slug: 'rubber',
  provides: ['wood', 'bark', 'latex'],
  requirements: {
    temperature: { min: 22, max: 32 },
    humidity: { min: 75, max: 95 },
  }
});

export const BreadfruitSchema: BulkResourceSchema = createTreeSchema({
  name: 'breadfruit',
  slug: 'breadfruit',
  provides: ['wood', 'bark', 'fruit'],
  requirements: {
    temperature: { min: 24, max: 35 },
    humidity: { min: 80, max: 100 },
  }
});

// Marsh (Tropical) Trees - Wetland specialists
export const BaldCypressSchema: BulkResourceSchema = createTreeSchema({
  name: 'bald cypress',
  slug: 'bald-cypress',
  requirements: {
    temperature: { min: 15, max: 35 },
    humidity: { min: 85, max: 100 },
    seasons: ['spring', 'summer', 'fall']
  }
});

export const MangroveSchema: BulkResourceSchema = createTreeSchema({
  name: 'mangrove',
  slug: 'mangrove',
  requirements: {
    temperature: { min: 20, max: 35 },
    humidity: { min: 90, max: 100 },
    seasons: ['spring', 'summer', 'fall']
  }
});
