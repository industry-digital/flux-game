import { Item } from '~/types/entity/item';
import { AbstractItemSchema } from '~/types/schema/item';
import { DimensionURN } from '~/types/taxonomy';

export enum ContainerStrategy {
  /**
   * A Bundle is a loose, heterogeneous assortment of items.
   * Examples:
   *   - A pile of loot
   *   - A collection of resources, such as a bundle of wood or a sack of grain
   *
   * A Bundle can contain arbitrary quantities of items.
   */
  BUNDLE = 'bundle',
  /**
   * A chest is a Bundle that has some kind of associated skill check that must be passed to access its contents.
   * Examples:
   *  - A locked chest that requires a lockpicking skill check
   *  - A digital lockbox that requires hacking to open
   */
  CHEST = 'chest',
  /**
   * A Bag is a Bundle that can be attached to an anatomical position of an entity and can be worn as equipment.
   */
  BAG = 'bag',
}

export type ContainerCapacitySpecification = Record<DimensionURN, number>;

export type AbstractContainer<
  S extends ContainerStrategy,
> = Item & {
  /**
   * The strategy used by the container
   */
  strategy: S;
  /**
   * The maximum capacity of the container in grams
   */
  capacity: ContainerCapacitySpecification;
};

/**
 * Schema for container items
 */
export type ContainerSchema<
  TStrategy extends ContainerStrategy = ContainerStrategy
  > = AbstractItemSchema<'container'> & {
  strategy: TStrategy;

  /**
   * The maximum weight this container can hold in grams
   */
  capacity: ContainerCapacitySpecification;
};


export type BundleSchema = ContainerSchema<ContainerStrategy.BUNDLE>;
export type ChestSchema = ContainerSchema<ContainerStrategy.CHEST>;
export type BagSchema = ContainerSchema<ContainerStrategy.BAG>;
