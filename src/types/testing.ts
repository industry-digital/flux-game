import { Entity, EntityType } from '@flux/entity/entity';

export type EntityTransformer = <T extends EntityType>(entity: Entity<T>) => Entity<T>

export const identity = <T>(x: T): T => x;
