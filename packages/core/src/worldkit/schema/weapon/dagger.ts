import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';
import { DamageModel, DamageType } from '~/types/damage';
import { Stat } from '~/types/entity/actor';

export const createDaggerSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'dagger',
    baseMass: 500, // 0.5kg - light, fast weapon
    range: {
      optimal: 1,
      max: 1,
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.FIN,
      base: '1d6',
      massEffect: 0.1,
      types: {
        [DamageType.PIERCE]: 1,
      },
    },
  });
};
