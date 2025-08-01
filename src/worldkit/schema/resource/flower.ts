import { UnitOfMeasure, TimeUnit } from '~/types';
import { BulkResourceSchema } from '~/types/schema/resource';

// Helper function to create flower schemas with proper typing
function createFlowerSchema(overrides: Partial<BulkResourceSchema>): BulkResourceSchema {
  return {
    kind: 'flower',
    provides: ['flower', 'nectar'],
    quantification: {
      type: 'bulk',
      quantity: {
        measure: UnitOfMeasure.EACH,
        min: 1,
        capacity: 100
      }
    },
    requirements: {
      temperature: { min: 5, max: 35 },
      humidity: { min: 30, max: 80 },
      ppfd: { min: 400 },
      seasons: ['spring', 'summer'],
      time: ['morning', 'day', 'afternoon']
    },
    growth: {
      curve: 'LOGISTIC',
      duration: [3, TimeUnit.DAY]
    },
    decay: {
      curve: 'EXPONENTIAL',
      duration: [1, TimeUnit.WEEK]
    },
    ...overrides
  } as BulkResourceSchema;
}

// Desert/Arid Flowers
export const DesertMarigoldSchema: BulkResourceSchema = createFlowerSchema({
  name: 'desert marigold',
  slug: 'desert-marigold',
  requirements: {
    temperature: { min: 15, max: 35 },
    humidity: { min: 15, max: 45 },
    ppfd: { min: 1_200 },
    seasons: ['spring', 'summer'],
    time: ['morning', 'day', 'afternoon']
  }
});

export const WildBergamotSchema: BulkResourceSchema = createFlowerSchema({
  name: 'wild bergamot',
  slug: 'wild-bergamot',
  requirements: {
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 85 },
    ppfd: { min: 300 },
    seasons: ['summer', 'fall'],
    time: ['dawn', 'morning', 'day', 'afternoon', 'evening']
  }
});

// Temperate Grassland Flowers
export const PurpleConeflowerSchema: BulkResourceSchema = createFlowerSchema({
  name: 'purple coneflower',
  slug: 'purple-coneflower',
  provides: ['flower', 'nectar', 'seed'],
  requirements: {
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 70 },
    ppfd: { min: 600 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon']
  }
});

export const BlackEyedSusanSchema: BulkResourceSchema = createFlowerSchema({
  name: 'black-eyed susan',
  slug: 'black-eyed-susan',
  requirements: {
    temperature: { min: 5, max: 32 },
    humidity: { min: 40, max: 70 },
    ppfd: { min: 800 },
    seasons: ['summer'],
    time: ['morning', 'day', 'afternoon']
  }
});

// Forest/Mountain Ecotone Flowers
export const WildColumbineSchema: BulkResourceSchema = createFlowerSchema({
  name: 'wild columbine',
  slug: 'wild-columbine',
  requirements: {
    temperature: { min: 0, max: 30 },
    humidity: { min: 10, max: 85 },
    ppfd: { min: 200 },
    seasons: ['spring', 'summer'],
    time: ['dawn', 'morning', 'day']
  }
});

export const FireweedSchema: BulkResourceSchema = createFlowerSchema({
  name: 'fireweed',
  slug: 'fireweed',
  provides: ['flower', 'nectar', 'fiber'],
  requirements: {
    temperature: { min: 0, max: 30 },
    humidity: { min: 10, max: 85 },
    ppfd: { min: 300 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon', 'evening']
  }
});

// Mountain/Jungle Ecotone Flowers
export const MountainPassionVineSchema: BulkResourceSchema = createFlowerSchema({
  name: 'mountain passion vine',
  slug: 'mountain-passion-vine',
  requirements: {
    temperature: { min: 20, max: 25 },
    humidity: { min: 35, max: 95 },
    ppfd: { min: 400 },
    seasons: ['spring', 'summer', 'fall'],
    time: ['day', 'afternoon'],
    biomes: ['mountain']
  }
});

export const TropicalGingerSchema: BulkResourceSchema = createFlowerSchema({
  name: 'tropical ginger',
  slug: 'tropical-ginger',
  requirements: {
    temperature: { min: 18 },
    humidity: { min: 60 },
    ppfd: { min: 100 },
    seasons: ['spring', 'summer'],
    time: ['dawn', 'morning', 'day'],
    lunar: ['waxing', 'full']
  }
});

// Forest + Mountain ecotone
export const WildTrilliumSchema: BulkResourceSchema = createFlowerSchema({
  name: 'wild trillium',
  slug: 'wild-trillium',
  requirements: {
    temperature: { min: 10 },
    humidity: { min: 50, max: 90 },
    ppfd: { min: 100 },
    time: ['dawn', 'morning', 'day'],
    biomes: ['forest', 'mountain']
  }
});

// Pure Ecosystem Flowers

// Mountain (Arid)
export const AlpineAsterSchema: BulkResourceSchema = createFlowerSchema({
  name: 'alpine aster',
  slug: 'alpine-aster',
  requirements: {
    temperature: { min: 0, max: 25 },
    humidity: { min: 10, max: 35 },
    ppfd: { min: 800 },
    seasons: ['summer', 'fall'],
    time: ['day', 'afternoon']
  }
});

// Jungle (Tropical)
export const JungleOrchidSchema: BulkResourceSchema = createFlowerSchema({
  name: 'orchid',
  slug: 'orchid',
  requirements: {
    temperature: { min: 20, max: 35 },
    humidity: { min: 75, max: 95 },
    ppfd: { min: 100, max: 600 },
    seasons: ['spring', 'summer', 'fall'],
    time: ['dawn', 'morning'],
    lunar: ['new', 'waxing']
  }
});

// Marsh (Tropical)
export const WaterLilySchema: BulkResourceSchema = createFlowerSchema({
  name: 'water lily',
  slug: 'water-lily',
  provides: ['flower', 'nectar', 'roots'],
  requirements: {
    temperature: { min: 10, max: 30 },
    humidity: { min: 85, max: 100 },
    ppfd: { min: 400 },
    seasons: ['summer'],
    time: ['morning', 'day', 'afternoon']
  }
});

// Additional Ecotone Flowers

// Steppe/Grassland Ecotone
export const PrairieRoseSchema: BulkResourceSchema = createFlowerSchema({
  name: 'prairie rose',
  slug: 'prairie-rose',
  provides: ['flower', 'nectar', 'fruit'],
  requirements: {
    temperature: { min: 8, max: 33 },
    humidity: { min: 25, max: 60 },
    ppfd: { min: 600 },
    seasons: ['spring', 'summer']
  }
});

// Steppe/Mountain Ecotone
export const DesertLupineSchema: BulkResourceSchema = createFlowerSchema({
  name: 'desert lupine',
  slug: 'desert-lupine',
  requirements: {
    temperature: { min: 5, max: 30 },
    humidity: { min: 15, max: 40 },
    ppfd: { min: 800 },
    seasons: ['spring'],
    time: ['morning', 'day', 'afternoon']
  }
});

// Grassland/Mountain Ecotone
export const MountainSunflowerSchema: BulkResourceSchema = createFlowerSchema({
  name: 'mountain sunflower',
  slug: 'mountain-sunflower',
  provides: ['flower', 'nectar', 'seeds'],
  requirements: {
    temperature: { min: 2, max: 28 },
    humidity: { min: 30, max: 60 },
    ppfd: { min: 700 },
    seasons: ['summer', 'fall'],
    time: ['morning', 'day', 'afternoon']
  }
});

// Forest/Jungle Ecotone
export const BlackLotusSchema: BulkResourceSchema = createFlowerSchema({
  name: 'black lotus',
  slug: 'black-lotus',
  provides: ['flower', 'nectar', 'nectar', 'seeds', 'roots'],
  requirements: {
    temperature: { min: 15, max: 32 },
    humidity: { min: 60, max: 90 },
    ppfd: { max: 200 },
    seasons: ['spring', 'summer', 'fall'],
    lunar: ['full'] // Only during full moon
  }
});

// Jungle/Marsh Ecotone
export const SwampOrchidSchema: BulkResourceSchema = createFlowerSchema({
  name: 'swamp orchid',
  slug: 'swamp-orchid',
  requirements: {
    temperature: { min: 15, max: 32 },
    humidity: { min: 80, max: 98 },
    seasons: ['spring', 'summer'],
    time: ['dusk', 'night'],
    lunar: ['full'] // Only during full moon
  }
});
