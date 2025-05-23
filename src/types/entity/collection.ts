import { Taxonomy } from '~/types/taxonomy';
import { Entity, EntityType } from './entity';

export type CollectionURN = Taxonomy.Collections;

export enum CollectionType {
  MAP = 'map',
  LIST = 'list',
  SET = 'set',
}

export interface MapCollectionAttributes<
  K extends string = string,
  I = any,
> {
  type: CollectionType.MAP;
  items: Record<K, I>;
}

export interface ListCollectionAttributes<
  K extends string = string,
  I = any,
> {
  type: CollectionType.LIST;
  items: Record<K, I>;
}

export type SetCollectionAttributes<K extends string = string> = MapCollectionAttributes<K, 1>;

export type AllowedCollectionAttributes<
  K extends string = string,
  I = any,
> = MapCollectionAttributes<K, I> | ListCollectionAttributes<K, I> | SetCollectionAttributes<K>;

/**
 * A Collection is a homogeneous or heterogeneous collection of entities.
 * Examples:
 * - items
 * - characters
 * - places
 */
export type Collection<
  A extends AllowedCollectionAttributes = AllowedCollectionAttributes
> = Entity<EntityType, A>;
