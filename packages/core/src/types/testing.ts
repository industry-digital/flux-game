import { AbstractEntity, EntityType } from './entity/entity';

export type EntityTransformer<T extends EntityType = EntityType> = (entity: AbstractEntity<T>) => AbstractEntity<T>;

export const identity = <T>(x: T): T => x;
