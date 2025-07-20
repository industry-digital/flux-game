import { EcosystemURN, EntityURN, PlaceURN, RootNamespace } from '~/types/taxonomy';
import { EntityType, AbstractEntity, Describable } from './entity';
import { Direction } from '~/types/world/space';
import { SpecialVisibility } from '~/types/world/visibility';
import { ResourceGenerator } from './resource';

export type PlaceVisibilityRules = Record<EntityURN, 1>;

/**
 * A description of an entity within a Place
 */
export type PlaceEntityDescriptor = {

  /**
   * A record of the visibility of this entity to other entities in the same Place
   */
  vis: SpecialVisibility | PlaceVisibilityRules;
};

export type ExitInput = {
  /**
   * The direction of the exit
   */
  direction: Direction;

  /**
   * Human-friendly string label for the exit
   */
  label?: string;

  /**
   * The destination of the exit. This is a URN-like string like `${RootNamespace}:place:world:nightcity:central-park`.
   */
  to?: PlaceURN;
};

/**
 * An Exit is one-directional portal connects a Place to another, like a portal. If you need two connected Places to be
 * traversable in either direction, you need an Exit in both Places, each pointing to the other.
 */
export type Exit = {
  /**
   * The direction of the exit
   */
  direction: Direction;

  /**
   * Human-friendly string label for the exit
   */
  label: string;

  /**
   * The destination of the exit. This is a URN-like string like `${RootNamespace}:place:world:nightcity:central-park`.
   */
  to: PlaceURN;
};

export type Exits = Partial<Record<Direction, Exit>>;
export type ExitInputs = Partial<Record<Direction, ExitInput>>;
export type PlaceEntities = Partial<Record<`${RootNamespace}:${EntityType}:${string}`, PlaceEntityDescriptor>>;

/**
 * The input type for creating a new Place, containing only the required fields
 * that need to be provided when creating a Place.
 */
export type PlaceInput = {
  id: PlaceURN;
  name?: string;
  description?: string;
  exits?: Exits;
} & Partial<ResourceGenerator>;

export type Weather = {
  // FUNDAMENTAL INPUTS (sources of truth)
  /**
   * The temperature in degrees Celsius
   */
  temperature: number;

  /**
   * The atmospheric pressure in hectopascals (hPa)
   */
  pressure: number;

  /**
   * The relative humidity as a percentage (0-100)
   */
  humidity: number;

  // DERIVED OUTPUTS (computed from inputs)
  /**
   * Instantaneous precipitation rate, expressed as `mm/hour`
   * Computed from temperature, pressure, and humidity
   */
  precipitation: number;

  /**
   * Photosynthetic Photon Flux Density in `μmol photons m⁻² s⁻¹`
   * Computed from cloud cover and solar geometry (angle of the sun)
   */
  ppfd: number;

  /**
   * Cloud coverage as a percentage (0-100)
   * Computed from humidity, pressure, and temperature
   */
  clouds: number;

  // METADATA
  /**
   * The last time the weather was updated, in milliseconds since the Unix epoch
   */
  ts: number;
};

/**
 * A Place represents a physical location in our game world. There is always a MUD room (i.e. XMPP MUC chat room)
 * associated with a Place. It can also represent a larger area, such as a city or a region. Topology is entirely
 * determined by the natural containment hierarchy of Places via `parentId`.
 *
 * All Places must belong to a parent Place, except for the root of all Places, which is a well-known Place named `world`.
 * A fundamental truth to our world is that all Places must be present in either `world` or `nowhere`, which is also
 * a well-known Place.
 */
export type Place =
  & AbstractEntity<EntityType.PLACE>
  & Describable
  & ResourceGenerator
  & {

  /**
   * Exits to other places
   */
  exits: Exits;

  /**
   * Entities currently in this place
   */
  entities: PlaceEntities;

  /**
   * `flux:eco:steppe:arid`
   * `flux:eco:grassland:temperate`
   * `flux:eco:forest:temperate`
   * `flux:eco:mountain:arid`
   * `flux:eco:jungle:tropical`
   * `flux:eco:marsh:tropical`
   */
  ecosystem: EcosystemURN;

  /**
   * The current weather conditions in this place
   */
  weather: Weather;

  /**
   * The coordinates of this place on a Cartesian grid
   */
  coordinates: [number, number];
};
