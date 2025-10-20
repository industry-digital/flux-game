import { HumanAnatomy, Stat } from '~/types';
import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';
import { DamageModel, DamageType } from '~/types/damage';

export const createSpearSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'spear',
    baseMass: 4_000, // 4kg - typical spear mass
    range: {
      optimal: 2,
      max: 2,
    },
    fit: {
      [HumanAnatomy.RIGHT_HAND]: 1,
      [HumanAnatomy.LEFT_HAND]: 1,
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.FIN,
      base: '2d6',
      massEffect: 0.6,
      types: {
        [DamageType.PIERCE]: 1,
      },
    },
  });
};
