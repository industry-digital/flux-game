import { UnitOfMeasure } from '~/types/world/measures';
import { EasingFunction } from '~/types/easing';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { TimeUnit } from '~/types/world/time';

type Bounds = { min?: number, max?: number };

export type GrowthBehaviorSpecification = {
  /**
   * Defaults to Easing.LOGISTIC
   */
  curve?: EasingFunction;

  /**
   * The duration over which a resource grows to 100% fullness from zero
   * - Example: [7, TimeUnit.DAY] means the resource grows to 100% fullness in seven days
   */
  duration: [number, TimeUnit];
};

export type ResourceGrowthRequirements = {
  /**
   * The temperature range in which this resource is available/active, in degrees Celsius
   */
  temperature?: Bounds;

  /**
   * The pressure range in which this resource is available/active, in hectopascals (hPa)
   */
  pressure?: Bounds;

  /**
   * The humidity range in which this resource is available/active, as percentages (0-100)
   */
  humidity?: Bounds;

  /**
   * The precipitation range in which this resource is available/active, in mm/hour
   */
  precipitation?: Bounds;

  /**
   * The photon flux density range in which this resource is available/active, in micromoles per square meter per second (umol/m2/s)
   */
  ppfd?: Bounds;

  /**
   * The cloud cover range in which this resource is available/active, as a percentage (0-100)
   */
  clouds?: Bounds;

  /**
   * Seasons when this resource is available/active
   * - Example: ['spring', 'summer'] for most flowers
   * - Example: ['fall'] for autumn-blooming flowers
   * - Example: ['winter'] for winter fungi
   */
  seasons?: Season[];

  /**
   * Times of day when this resource is available/active
   * - Example: ['dawn', 'morning', 'day'] for day-blooming flowers
   * - Example: ['dusk', 'night'] for night-blooming flowers
   * - Example: ['dawn', 'dusk'] for crepuscular resource activity
   */
  time?: TimeOfDay[];

  /**
   * Lunar phases when this resource is enhanced/active
   * - Example: ['full'] for resources that peak during full moon
   * - Example: ['new'] for resources that prefer dark nights
   */
  lunar?: LunarPhase[];
};

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type TimeOfDay = 'dawn' | 'morning' | 'day' | 'afternoon' | 'evening' | 'dusk' | 'night';
export type LunarPhase = 'new' | 'waxing' | 'full' | 'waning';

export type ResourceNodeState = {
  quantity: number;
  quality: number;
  fullness: NormalizedValueBetweenZeroAndOne;
  last: {
    growth: number; // timestamp
    decay: number; // timestamp
  };
};

export type ResourceNodeStateWithTimestamp = ResourceNodeState & {
  ts: number;
};

export type ResourceStateRenderer = (state: ResourceNodeStateWithTimestamp, now: number, schema: ResourceSchema) => string;

type Noun = { singular: string, plural?: string };

type ResourceSchemaBase = {
  /**
   * Human-readable name of the resource, not capitalized.
   */
  name: string | Noun;

 /**
   * The "desirable things" that this resource provides
   * These are taxonomic atoms that describe the desirable things that can be extracted from the resource.
   * - Example: "nectar"
   * - Example: "honey"
   * - Example: "seed"
   * - Example: "fruit"
   * - Example: "wood"
   */
  provides: string[];

  /**
   * The requirements that must be met for the resource to grow.
   */
  requirements: ResourceGrowthRequirements;

  /**
   * How the resource grows over time
   */
  growth: GrowthBehaviorSpecification;

  /**
   * How the resource decays over time
   * A resource that is not growing is in a continuous state of decay.
   */
  decay: GrowthBehaviorSpecification;

  /**
   * A function that returns a description of the resource based on the schema and
   * current state of a resource node. The timestamp `ts` reflects the moment the
   * state was last update.
   * - Example: "a field filled with desert marigolds"
   * - Example: "a beehive, brimming with honey"
   * - Example: "a durian tree with a single fruit that *just* blossomed"
   *
   * Return a *noun* that describes the resource, without capitalization or full stops.
   * No special handling is needed for `fullness` being 0. In this case, the description is
   * not rendered.
   */
  description: ResourceStateRenderer;
}

/**
 * This lets us model a resource node that produces a single "specimen"
 * having a "quality" dimension.
 * - Example: a single beehive that contains 500mL of honey vs 250mL
 * - Example: a single durian fruit that weights 2kg vs the same that weights 1kg
 */
export type SpecimenResourceSchema = ResourceSchemaBase & {

  quantity: {
    measure: UnitOfMeasure.EACH;
    min: 1;
    capacity: 1;
  };

  quality: {
    measure: Exclude<UnitOfMeasure, UnitOfMeasure.EACH>;
    min: number;
    capacity: number;
    curve?: EasingFunction;
  };
};

/**
 * This lets us model a resource node that produces a bulk quantity of a resource,
 * without a "quality" dimension.
 * - Example: 200kg of prairie grass
 * - Example: 1,000 mL of exceptionally clean water
 */
export type BulkResourceSchema = ResourceSchemaBase & {
  quantity: {
    measure: UnitOfMeasure;
    min?: number;
    capacity: number;
    curve?: EasingFunction,
  };
};

export type ResourceSchema = SpecimenResourceSchema | BulkResourceSchema;
