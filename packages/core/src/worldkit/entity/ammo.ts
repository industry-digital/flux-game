import { AmmoItem } from '~/types/entity/ammo';
import { AmmoSchema } from '~/types/schema/ammo';
import { ItemURN } from '~/types/taxonomy';

export const createAmmoItem = (id: ItemURN, schema: AmmoSchema): AmmoItem => {
  return {
    id,
    schema: schema.urn,
    current: schema.capacity,
  };
};
