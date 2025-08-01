import { UnitOfMass, UnitOfMeasure, UnitOfVolume } from '~/types/world/measures';
import { EasingFunctionName } from '~/types/easing';
import { TimeUnit } from '~/types/world/time';
import { Biome, Climate } from '~/types/schema/ecology';
import { CommandType } from '~/types/intent';
import { Requirements } from '~/types/requirement';

type Bounds = { min?: number, max?: number };

export type GrowthSpecification = {
  /**
   * The easing function to use for the growth curve
   */
  curve: EasingFunctionName;

  /**
   * The duration over which a resource grows to 100% fullness from zero
   * - Example: [7, TimeUnit.DAY] means the resource grows to 100% fullness in seven days
   */
  duration: [number, TimeUnit],
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
   * The fog intensity range in which this resource is available/active, as a normalized value (0-1)
   * 0 = no fog, 1 = dense fog
   */
  fog?: Bounds;

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

  /**
   * To restrict the resource to specific biomes
   */
  biomes?: Biome[];

  /**
   * To restrict the resource to specific climates
   */
  climates?: Climate[];
};

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type TimeOfDay = 'dawn' | 'morning' | 'day' | 'afternoon' | 'evening' | 'dusk' | 'night';
export type LunarPhase = 'new' | 'waxing' | 'full' | 'waning';

export type ResourceStateRenderer = (position: number, value: number, now: number, schema: ResourceSchema) => string;

type AbstractResourceSchema<QuantificationStrategy extends ResourceQuantificationStrategy> = {
  /**
   * Human-readable name of the resource, not capitalized.
   */
  name: string;

  /**
   * A URN fragment used in the resource URN, derived from name.
   * This should be a URL-safe, lowercase, hyphenated version of the name.
   * Example: "large pond" -> "large-pond"
   */
  slug: string;

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
   * The minimum "environmental fitness" score required for the resource to grow.
   * Defaults to zero if not specified.
   *
   * - Example: 0.9 for a resource that requires a high environmental fitness score to grow
   * - Example: 0.0 for a resource that "grows" everywhere
   */
  rarity?: number;

  /**
   * The requirements that must be met for the resource to grow.
   */
  requirements: ResourceGrowthRequirements;

  /**
   * How the resource grows over time
   */
  growth: GrowthSpecification;

  /**
   * How the resource decays over time
   * A resource that is not growing begins to decay
   * If not specified, the resource decays, by default, according to the inverse of the `growth` curve
   */
  decay?: GrowthSpecification;

  /**
   * Defines all possible ways actors may interact with the resource. If not provided,
   * the resource is *non-interactive*.
   */
  interactions?: Record<CommandType, Requirements>;

  /**
   * The quantification strategy of the resource
   */
  quantification: QuantificationStrategy;
};
export type ResourceQuantificationType = 'bulk' | 'specimen';
export type AbstractQuantificationStrategy<T extends ResourceQuantificationType> = {
  type: T;
};

export type BulkQuantificationStrategy = AbstractQuantificationStrategy<'bulk'> & {
  quantity: {
    measure: UnitOfMeasure | UnitOfMass | UnitOfVolume;
    min?: number;    // Minimum quantity (e.g., 50kg - field never completely empty)
    capacity: number; // Maximum quantity (e.g., 200kg of grass)
    curve?: EasingFunctionName; // Optional override of growth.curve for quantity
  };
};

export type SpecimenQuantificationStrategy = AbstractQuantificationStrategy<'specimen'> & {
  quantity: {
    measure: UnitOfMeasure.EACH;
    min: 1;
    capacity: 1;
  };
  quality: {
    measure: Exclude<UnitOfMeasure, UnitOfMeasure.EACH> | UnitOfMass | UnitOfVolume;
    min: number;     // Minimum quality (e.g., 0.5kg for smallest valid fruit)
    capacity: number; // Maximum quality (e.g., 2kg for largest possible fruit)
  };
};

export type ResourceQuantificationStrategy = BulkQuantificationStrategy | SpecimenQuantificationStrategy;

/**
 * A resource that produces a single specimen whose quality grows over time.
 * Examples:
 * - A single beehive that grows from empty to full of honey
 * - A single durian fruit that grows from small to large
 * - A single tree that grows from sapling to mature
 *
 * The growth curve directly controls quality growth:
 * - quality.min + (growthCurve(t) * (quality.capacity - quality.min))
 */
export type SpecimenResourceSchema = AbstractResourceSchema<SpecimenQuantificationStrategy>;

/**
 * A resource that produces a bulk quantity that grows over time.
 * Examples:
 * - A field that grows from 0 to 200kg of grass
 * - A pond that fills from 0 to 1000L of water
 * - A patch that grows from 0 to 100 flowers
 *
 * The growth curve directly controls quantity growth:
 * - quantity.min + (growthCurve(t) * (quantity.capacity - quantity.min))
 *
 * Optionally can specify a different curve for quantity growth:
 * - quantity.curve overrides growth.curve for quantity calculations
 */
export type BulkResourceSchema = AbstractResourceSchema<BulkQuantificationStrategy>;

export type ResourceSchema = SpecimenResourceSchema | BulkResourceSchema;
