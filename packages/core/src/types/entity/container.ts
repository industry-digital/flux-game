import { ModifiableBoundedAttribute } from '~/types/entity/attribute';
import { AbstractItem, Item } from '~/types/entity/item';
import { PlaceURN } from '~/types/taxonomy';

/**
 * A `pile` is a loose collection of items that belong to a single actor
 * A `backpack` is a container that can be worn on the actor's person
 * A `chest` is a container that can be opened by the actor
 */
export type ContainerStrategy = 'pile' | 'backpack' | 'chest';

/**
 * Mixin for container items that can hold other items
 */
export type Container<TStrategy extends ContainerStrategy = ContainerStrategy> = AbstractItem<'container'> & {
  /**
   * Container strategy
   */
  strategy: TStrategy;

  label: string;

  /**
   * The container's location. If not present, the container is considered to be in an actor's inventory.
   */
  location?: PlaceURN;

  /**
   * The container's capacity
   */
  capacity: ModifiableBoundedAttribute;

  /**
   * The container's contents
   */
  contents: Record<string, Item>;
}
