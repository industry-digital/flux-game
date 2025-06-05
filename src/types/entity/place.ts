import { EntityURN, PlaceURN, RootNamespace } from '~/types/taxonomy';
import { EntityType, AbstractEntity, DescribableMixin } from './entity';
import { Direction } from '~/types/world/space';
import { SpecialVisibility } from '~/types/world/visibility';

/**
 * A reference to an Entity within a Place.
 */
export type PlaceEntityDescriptor<T extends EntityType = EntityType> = {
  /**
   * The entity
   */
  entity: AbstractEntity<T>;
  /**
   * The visibility of this entity to other entities.
   */
  visibility: SpecialVisibility | Partial<Record<EntityURN<T>, 1>>;
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
   * The destination of the exit. This is a URN-like string like `${RootNamespace}:place:world:nightcity:central-park`.
   */
  to: PlaceURN;
};

export type Exits = Partial<Record<Direction, Exit>>;
export type PlaceEntities = Partial<Record<`${RootNamespace}:${EntityType}:${string}`, PlaceEntityDescriptor>>;

/**
 * The input type for creating a new Place, containing only the required fields
 * that need to be provided when creating a Place.
 */
export type PlaceInput = {
  name?: string;
  description?: string;
  exits?: Exits;
  entities?: PlaceEntities;
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
  & DescribableMixin
  & {

  /**
   * Exits to other places
   */
  exits: Exits;

  /**
   * Entities currently in this place
   */
  entities: PlaceEntities;
};
