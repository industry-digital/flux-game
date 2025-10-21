import { AbstractItem } from '~/types/entity/item';

export type AmmoItem = AbstractItem<'ammo'> & {
  current: number;
};
