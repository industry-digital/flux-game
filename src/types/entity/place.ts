import { EntityURN, PlaceURN, RootNamespace } from '~/types/taxonomy';
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

export enum ClimateType {
  // Temperature-based classifications
  TROPICAL = 'tropical',                    // Hot year-round
  TEMPERATE = 'temperate',                  // Moderate temperatures, distinct seasons
  CONTINENTAL = 'continental',              // Large temperature variations, cold winters
  POLAR = 'polar',                         // Extremely cold year-round
  ALPINE = 'alpine',                       // Cold, high altitude conditions

  // Precipitation-based classifications
  HUMID = 'humid',                         // High precipitation year-round
  ARID = 'arid',                           // Low precipitation
  MONSOON = 'monsoon',                     // Seasonal heavy rains
  MEDITERRANEAN = 'mediterranean',          // Dry summers, wet winters
  OCEANIC = 'oceanic',                     // Maritime influence

  // Special climates
  ARTIFICIAL = 'artificial',               // Magically/technologically controlled
}

export enum BiomeType {
  // Forest biomes
  RAINFOREST = 'rainforest',
  FOREST = 'forest',
  BOREAL = 'boreal',

  // Grassland biomes
  SAVANNA = 'savanna',
  GRASSLAND = 'grassland',
  PRAIRIE = 'prairie',
  STEPPE = 'steppe',

  // Desert biomes
  DESERT = 'desert',
  SCRUBLAND = 'scrubland',

  // Wetland biomes
  SWAMP = 'swamp',
  MARSH = 'marsh',
  MANGROVE = 'mangrove',

  // Polar/Alpine biomes
  TUNDRA = 'tundra',
  MEADOW = 'meadow',
  ICE = 'ice',

  // Aquatic biomes
  FRESHWATER = 'freshwater',
  MARINE = 'marine',
  COASTAL = 'coastal',
  REEF = 'reef',

  // Special biomes
  URBAN = 'urban',
  AGRICULTURAL = 'agricultural',
  ARTIFICIAL = 'artificial',
  MAGICAL = 'magical',
}

/**
 * The input type for creating a new Place, containing only the required fields
 * that need to be provided when creating a Place.
 */
export type PlaceInput = {
  id: PlaceURN;
  name?: string;
  description?: string;
  exits?: Exits | ExitInput[];  // Support both dictionary and array formats
  biome: BiomeType;
  climate: ClimateType;
} & Partial<ResourceGenerator>;

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

  biome: BiomeType;
  climate: ClimateType;
};
