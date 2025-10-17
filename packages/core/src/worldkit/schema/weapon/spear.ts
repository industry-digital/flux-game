import { HumanAnatomy } from '~/types';
import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';

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
  });
};
