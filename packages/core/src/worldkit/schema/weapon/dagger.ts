import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';
import { DamageModel, DamageType } from '~/types/damage';
import { Stat } from '~/types/entity/actor';
import { ONE_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

export const createDaggerSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    urn: 'flux:schema:weapon:dagger',
    name: input.name || 'dagger',
    fit: ONE_HANDED_FIT,
    baseMass: 500, // 0.5kg - light, fast weapon
    range: {
      optimal: 1,
      max: 1,
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.FIN,
      base: '1d6',
      efficiency: 0.1,
      types: {
        [DamageType.PIERCE]: 1,
      },
    },
  });
};
