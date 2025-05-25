import { Entity, EntityType } from './entity';
import { EntityURN, PlaceURN } from '~/types/taxonomy';
import { Direction } from '~/types/world/space';
import { SpecialVisibility } from '~/types/world/visibility';

export interface PlaceScopedHistoricalEvent {
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
}

export type PlaceEntityDescriptor<T extends EntityType = EntityType>  = {
  /**
   * The entity
   */
  entity: Entity<T, any>;
  /**
   * The visibility of this entity to other entities.
   */
  visibility: SpecialVisibility | Partial<Record<EntityURN, 1>>;
}

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
}

export type Exits = Partial<Record<Direction, Exit>>;
export type PlaceEntities = Partial<Record<EntityURN, PlaceEntityDescriptor>>;

/**
 * This is the representation of a Place we store in the database.
 */
export interface PlaceAttributes {
  exits: Exits;
  entities: PlaceEntities;
  history: PlaceScopedHistoricalEvent[];
}

/**
 * A Place represents a physical location in our game world. There is always a MUD room (i.e. XMPP MUC chat room)
 * associated with a Place. It can also represent a larger area, such as a city or a region. Topology is entirely
 * determined by the natural containment hierarchy of Entities via `parentId`.
 *
 * All Places must belong to a parent Place, except for the root of all Places, which is a well-known Place named `world`.
 * A fundamental truth to our world is that all Entities, including all Places, must be present in either `world` or
 * `nowhere`, which is also a well-known Place.
 */
export type Place = Entity<EntityType.PLACE, PlaceAttributes>;
