import { Place } from '~/types/entity/place';
import { EntityType } from '~/types/entity/entity';
import { BiomeType, ClimateType } from '~/types/entity/place';
import { Direction } from '~/types/world/space';
import { ProductionCurve } from '~/types/entity/resource';
import { WellKnownDuration } from '~/types/world/time';

/**
 * A forest clearing with subtle resource hints embedded in the description
 */
export const forestClearingPlace: Place = {
  // AbstractEntity fields
  id: 'flux:place:eldermore:forest-clearing',
  type: EntityType.PLACE,

  // Describable fields
  name: 'Elderwood Clearing',
  description: `A tranquil forest clearing opens before you, dominated by ancient oak trees whose thick trunks and gnarled branches speak of centuries of growth. Sunlight filters through the canopy above, dappling the forest floor with shifting patterns of light and shadow. The air is fresh and clean, carrying the sound of babbling water from somewhere to the east where a brook winds its way through the woodland.

Clusters of blackberry bushes dot the clearing's edge, their dark fruits hanging heavy on thorny canes. To the north, the land rises toward what appears to be a rocky outcrop, while dense woods stretch endlessly to the south, their depths mysterious and inviting.

The clearing feels like a natural crossroads - a place where forest creatures might come to drink and travelers might pause to rest. There's something almost magical about the way the light plays across the ancient oaks, and you notice some of the exposed earth near the northern edge has an unusual reddish tint, as if metallic deposits lie just beneath the surface.`,

  // Place-specific fields
  biome: BiomeType.FOREST,
  climate: ClimateType.TEMPERATE,

  exits: {
    [Direction.NORTH]: {
      direction: Direction.NORTH,
      label: 'rocky outcrop',
      to: 'flux:place:eldermore:rocky-outcrop'
    },
    [Direction.SOUTH]: {
      direction: Direction.SOUTH,
      label: 'dense woods',
      to: 'flux:place:eldermore:dense-woods'
    },
    [Direction.EAST]: {
      direction: Direction.EAST,
      label: 'along the brook',
      to: 'flux:place:eldermore:brook-path'
    }
  },

  entities: {
    // Currently empty - no actors or items in this place
  },

  // ResourceGenerator fields with subtle hints in description above
  resources: {
    ts: Date.now(),
    nodes: {
      'flux:resource:water': {
        uom: 'flux:dimension:volume:liter',
        available: 45,
        capacity: 50,
        production: {
          quantity: 8,
          period: WellKnownDuration.HOUR,
          curve: ProductionCurve.LINEAR
        }
      },

      'flux:resource:fruit:blackberry': {
        uom: 'flux:dimension:mass:kilogram',
        available: 12,
        capacity: 15,
        production: {
          quantity: 2,
          period: WellKnownDuration.DAY,
          curve: ProductionCurve.LOGISTIC
        }
      },

      'flux:resource:wood:oak': {
        uom: 'flux:dimension:mass:kilogram',
        available: 80,
        capacity: 100,
        production: {
          quantity: 1,
          period: WellKnownDuration.WEEK,
          curve: ProductionCurve.LOGISTIC
        }
      },

      'flux:resource:ore:iron': {
        uom: 'flux:dimension:mass:kilogram',
        available: 8,
        capacity: 25,
        production: {
          quantity: 1,
          period: WellKnownDuration.WEEK,
          curve: ProductionCurve.NONE
        }
      }
  }
};
