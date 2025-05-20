import { Entity, EntityURN } from '~/types/domain';

export type EntityTransformer = <T extends EntityURN>(entity: Entity<T>) => Entity<T>

export const identity = <T>(x: T): T => x;
