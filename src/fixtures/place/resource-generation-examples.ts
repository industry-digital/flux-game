import { Place } from '~/types/entity/place';
import { EntityType } from '~/types/entity/entity';
import { ResourceURN } from '~/types/taxonomy';
import { updatePlaceResourceGeneration, harvestResourceFromPlace } from '~/lib/place';

/**
 * Example: A forest that generates wood and berries at steady rates
 */
export const enchantedForest: Place = {
  id: 'flux:place:world:enchanted-forest',
  type: EntityType.PLACE,
  name: 'Enchanted Forest',
  description: 'A mystical forest where ancient trees grow and berries ripen naturally.',
  exits: {},
  entities: {},

  resources: {
    'flux:resource:wood': {
      type: 'flux:resource:wood' as ResourceURN,
      uom: 'flux:dimension:mass:kg',
      available: 50,
      capacity: 200,
      production: {
        quantity: 5,
        period: '1h'
      },
      ts: Date.now()
    },

    'flux:resource:berries': {
      type: 'flux:resource:berries' as ResourceURN,
      uom: 'flux:dimension:mass:kg',
      available: 20,
      capacity: 100,
      production: {
        quantity: 8,
        period: '1h'
      },
      ts: Date.now()
    }
  }
};

/**
 * Example: A mine that generates ore and crystals at steady rates
 */
export const crystallineMine: Place = {
  id: 'flux:place:world:crystalline-mine',
  type: EntityType.PLACE,
  name: 'Crystalline Mine',
  description: 'A deep mine where precious crystals form naturally in the darkness.',
  exits: {},
  entities: {},

  resources: {
    'flux:resource:iron-ore': {
      type: 'flux:resource:iron-ore' as ResourceURN,
      uom: 'flux:dimension:mass',
      available: 100,
      capacity: 500,
      production: {
        quantity: 10,
        period: '4h'
      },
      ts: Date.now()
    },

    'flux:resource:crystal': {
      type: 'flux:resource:crystal' as ResourceURN,
      uom: 'flux:dimension:each',
      available: 5,
      capacity: 20,
      production: {
        quantity: 1,
        period: '1day'
      },
      ts: Date.now()
    }
  }
};

/**
 * Example: A farm that generates wheat at a steady rate
 */
export const sunnyFarm: Place = {
  id: 'flux:place:world:sunny-farm',
  type: EntityType.PLACE,
  name: 'Sunny Farm',
  description: 'A productive farm where crops grow steadily under careful tending.',
  exits: {},
  entities: {},

  resources: {
    'flux:resource:wheat': {
      type: 'flux:resource:wheat' as ResourceURN,
      uom: 'flux:dimension:mass',
      available: 75,
      capacity: 300,
      production: {
        quantity: 15,
        period: '6h'
      },
      ts: Date.now()
    }
  }
};

/**
 * Example usage: How to update and harvest resources
 */
export const resourceGenerationExamples = {
  enchantedForest,
  crystallineMine,
  sunnyFarm,

  // Example of how to use the resource generation system
  demonstrateUsage: () => {
    console.log('=== Resource Generation Example ===');

    // Simulate passage of time and calculate resource generation
    const timePassedMs = 4 * 60 * 60 * 1000; // 4 hours
    const currentTime = Date.now();
    const pastTime = currentTime - timePassedMs;

    // Update forest resources as if time has passed
    const forestWithUpdatedTime = {
      ...enchantedForest,
      resources: {
        ...enchantedForest.resources!,
        'flux:resource:wood': {
          ...enchantedForest.resources!['flux:resource:wood'],
          ts: pastTime
        },
        'flux:resource:berries': {
          ...enchantedForest.resources!['flux:resource:berries'],
          ts: pastTime
        }
      }
    };

    // This would be called when an actor interacts with the place
    // Resources are calculated based on time passed since last update
    const updatedForest = updatePlaceResourceGeneration(forestWithUpdatedTime, currentTime);

    console.log('Wood available:', updatedForest.resources?.['flux:resource:wood'].available);
    console.log('Berries available:', updatedForest.resources?.['flux:resource:berries'].available);

    // Example of harvesting resources
    const harvestResult = harvestResourceFromPlace(
      updatedForest,
      'flux:resource:wood' as ResourceURN,
      10, // Request 10 units
      currentTime
    );

    console.log('Harvested wood:', harvestResult.harvestedAmount);
    console.log('Remaining wood:', harvestResult.updatedPlace.resources?.['flux:resource:wood'].available);
  }
};

// Import the utility functions (these would be imported from the place lib)
