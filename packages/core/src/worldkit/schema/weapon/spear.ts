import { Stat } from '~/types';
import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';
import { DamageModel, DamageType } from '~/types/damage';
import { TWO_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

export const createSpearSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'spear',
    baseMass: 4_000, // 4kg - typical spear mass
    fit: TWO_HANDED_FIT,
    range: {
      optimal: 2,
      max: 2,
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.FIN,
      base: '2d6',
      efficiency: 0.6,
      types: {
        [DamageType.PIERCE]: 1,
      },
    },
  });
};
