import { EntityType, EmergentNarrative, BaseEntity, DescribableMixin, ParsedURN } from './entity';
import { EntityURN, PlaceURN } from '~/types/taxonomy';
import { Direction } from '~/types/world/space';
import { SpecialVisibility } from '~/types/world/visibility';

/**
 * The fragments that comprise a Place's total data.
 * Each value (except 'base') must exist as a field in the Place type.
 */
export enum PlaceFragmentName {
  /**
   * Core data: name, description, location, etc.
   */
  BASE = 'base',

  /**
   * The entities currently in this place
   */
  ENTITIES = 'entities',

  /**
   * Historical events that have occurred here
   */
  MEMORIES = 'memories'
}

export type PlaceScopedHistoricalEvent = {
  /**
   * The entity that caused or triggered the event
   */
  actor: EntityURN;
  /**
   * Human-readable summary of what happened
   */
  summary: string;
  /**
   * The moment it happened
   */
  ts: number;
};

export type PlaceEntityDescriptor<T extends EntityType = EntityType> = {
  /**
   * The entity
   */
  entity: BaseEntity<T>;
  /**
   * The visibility of this entity to other entities.
   */
  visibility: SpecialVisibility | Partial<Record<EntityURN, 1>>;
};

/**
 * An Exit is one-directional portal connects a Place to another, like a portal. If you need two connected Places to be
 * traversable in either direction, you need an Exit in both Places, each pointing to the other.
 */
export type Exit = {
  /**
   * Human-friendly string label for the exit
   */
  label: string;

  /**
   * The destination of the exit. This is a URN-like string like `flux:place:world:nightcity:central-park`.
   */
  to: PlaceURN;
};

export type Exits = Partial<Record<Direction, Exit>>;
export type PlaceEntities = Partial<Record<EntityURN, PlaceEntityDescriptor>>;

/**
 * A Place represents a physical location in our game world. There is always a MUD room (i.e. XMPP MUC chat room)
 * associated with a Place. It can also represent a larger area, such as a city or a region. Topology is entirely
 * determined by the natural containment hierarchy of Places via `parentId`.
 *
 * All Places must belong to a parent Place, except for the root of all Places, which is a well-known Place named `world`.
 * A fundamental truth to our world is that all Places must be present in either `world` or `nowhere`, which is also
 * a well-known Place.
 */
export type Place = BaseEntity<EntityType.PLACE> & DescribableMixin & {
  /**
   * The Place's location in the world
   */
  location?: PlaceURN;

  /**
   * For hierarchical containment
   */
  parent?: ParsedURN;

  /**
   * If this place is "owned" by another entity
   */
  owner?: ParsedURN;

  /**
   * The exits from this place to other places
   */
  exits: Exits;

  /**
   * The entities currently in this place.
   * Maps to PlaceFragment.ENTITIES
   */
  entities: PlaceEntities;

  /**
   * Historical events that have occurred in this place.
   * Maps to PlaceFragment.MEMORIES
   */
  memories: PlaceScopedHistoricalEvent[];
};

/**
 * The input type for creating a new Place, containing only the required fields
 * that need to be provided when creating a Place.
 */
export type PlaceInput = Omit<Place, keyof BaseEntity<EntityType.PLACE>> & {
  name: string;
  description: string | EmergentNarrative;
  location?: PlaceURN;
  owner?: ParsedURN;
  exits?: Exits;
  entities?: PlaceEntities;
  history?: PlaceScopedHistoricalEvent[];
};
