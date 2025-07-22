import { UnitOfMeasure, TimeUnit } from '~/types';
import { BulkResourceSchema } from '~/types/schema/resource';
import { Easing } from '~/lib/easing';

/**
 * Factory function for creating tree resource schemas using a transformer approach
 * Think of it more as a "copse" of trees, rather than a single tree.
 */
function createTreeSchema(
  transform: (defaults: BulkResourceSchema) => BulkResourceSchema,
): BulkResourceSchema {
  const defaults: Partial<BulkResourceSchema> = {
    name: 'tree',

    // All trees provide basic wood, bark
    provides: ['wood', 'bark'],

    // By default, trees need moderate growing conditions
    requirements: {
      temperature: { min: 5, max: 35 },
      humidity: { min: 30, max: 90 },
      ppfd: { min: 200 },
      precipitation: { min: 0.5 },
      seasons: ['spring', 'summer', 'fall']
    },

    // In our world, a copse of trees grows from zero to full size in a month
    growth: {
      curve: Easing.LOGISTIC,
      duration: [1, TimeUnit.MONTH]
    },

    // In our world, a copse of trees effectively never decays
    decay: {
      curve: Easing.LINEAR,
      duration: [100, TimeUnit.YEAR]
    },

    // A copse of trees contains up to 100 trees. Every Place in the world has
    // dimensions: 100m x 100m.
    quantity: {
      measure: UnitOfMeasure.EACH,
      capacity: 1_000,
    },

    /**
     * It is implied that the largest trees are harvested first.
     */
    description: ({ fullness }, now, { name }) => {
      if (fullness > 0.8) {
        return `a dense copse of mature ${ name } trees`;
      }
      if (fullness > 0.4) {
        return `a copse of young ${ name } trees`;
      }
      return `sparsely scattered ${ name } saplings`;
    },
  };

  return transform(defaults as BulkResourceSchema);
}

export const MesquiteSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'mesquite',
  provides: [...defaults.provides, 'nectar'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 10, max: 45 },
    humidity: { min: 15, max: 60 },
    precipitation: { min: 0.2 },
    seasons: ['spring', 'summer', 'fall']
  },
}));

export const JuniperSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'juniper',
  provides: [...defaults.provides, 'berries', 'resin'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 0, max: 40 },
    humidity: { min: 20, max: 70 },
    precipitation: { min: 0.3 }
  },
}));

// GRASSLAND (TEMPERATE) TREES - Prairie adapted, water-seeking

export const CottonwoodSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'cottonwood',
  volume: 40,
  requirements: {
    ...defaults.requirements,
    temperature: { min: -5, max: 35 },
    humidity: { min: 40, max: 95 },
    precipitation: { min: 1.0 },
    seasons: ['spring', 'summer', 'fall']
  },
  provides: [...defaults.provides, 'resin'],
  description: (state) => {
    if (state.fullness > 0.2) {
      return 'a copse of mature cottonwoods';
    }
    if (state.fullness > 0.1) {
      return 'a copse of young cottonwoods';
    }
    return 'a young cottonwood';
  },
}));

export const BurOakSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'bur oak',
  provides: [...defaults.provides, 'nuts'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: -15, max: 35 },
    humidity: { min: 35, max: 80 },
    precipitation: { min: 0.8 },
    seasons: ['spring', 'summer', 'fall']
  },
  description: ({ fullness }) => {
    if (fullness > 0.8) {
      return 'a grove of massive bur oaks with spreading crowns';
    }
    if (fullness > 0.4) {
      return 'a copse of sturdy bur oaks marking the prairie edge';
    }
    return 'scattered young bur oaks pioneering the grassland';
  },
}));

// FOREST (TEMPERATE) TREES - Classic woodland species

export const MapleSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'maple',
  provides: [...defaults.provides, 'sap'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: -15, max: 30 },
    humidity: { min: 45, max: 85 },
    precipitation: { min: 1.0 },
    seasons: ['spring', 'summer', 'fall']
  },
}));

export const WhiteBirchSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'white birch',
  provides: [...defaults.provides, 'sap'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: -20, max: 25 },
    humidity: { min: 40, max: 80 },
    precipitation: { min: 0.8 }
  },
}));

export const WhitePineSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'white pine',
  provides: [...defaults.provides, 'resin', 'nuts'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: -25, max: 25 },
    humidity: { min: 35, max: 80 },
    precipitation: { min: 0.7 },
    seasons: ['spring', 'summer', 'fall', 'winter'] // Evergreen
  },
}));

// MOUNTAIN (ARID) TREES - High altitude specialists

export const MountainPineSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'mountain pine',
  provides: [...defaults.provides, 'resin', 'nuts'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: -30, max: 20 },
    humidity: { min: 25, max: 70 },
    precipitation: { min: 0.5 },
    seasons: ['spring', 'summer', 'fall', 'winter']
  },
}));

export const AspenSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'aspen tree',
  requirements: {
    ...defaults.requirements,
    temperature: { min: -25, max: 25 },
    humidity: { min: 30, max: 75 },
    precipitation: { min: 0.6 }
  },
}));

// JUNGLE (TROPICAL) TREES - Diverse tropical species

export const MahoganySchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'mahogany',
  provides: [...defaults.provides, 'seeds'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 20, max: 35 },
    humidity: { min: 70, max: 95 },
    precipitation: { min: 2.0 },
    seasons: ['spring', 'summer', 'fall'],
  },
}));

export const RubberTreeSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'rubber',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 22, max: 32 },
    humidity: { min: 75, max: 95 },
    precipitation: { min: 2.5 }
  },
  provides: [...defaults.provides, 'latex'],
}));

export const BreadfruitSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'breadfruit',
  provides: [...defaults.provides, 'fruit'],
  requirements: {
    ...defaults.requirements,
    temperature: { min: 24, max: 35 },
    humidity: { min: 80, max: 100 },
    precipitation: { min: 2.0 }
  },
}));

// MARSH (TROPICAL) TREES - Wetland specialists

export const BaldCypressSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'bald cypress',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 15, max: 35 },
    humidity: { min: 85, max: 100 },
    precipitation: { min: 3.0 },
    seasons: ['spring', 'summer', 'fall']
  },
}));

export const MangroveSchema = createTreeSchema((defaults) => ({
  ...defaults,
  name: 'mangrove',
  requirements: {
    ...defaults.requirements,
    temperature: { min: 20, max: 35 },
    humidity: { min: 90, max: 100 },
    precipitation: { min: 2.5 },
    seasons: ['spring', 'summer', 'fall']
  },
  description: ({ fullness }) => {
    if (fullness > 0.8) {
      return `a copse of mature mangroves with tangled prop roots`;
    }
    if (fullness > 0.4) {
      return `a copse of young mangroves with tangled prop roots`;
    }
    return `a copse of mangrove saplings`;
  },
}));
