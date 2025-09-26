import { createWeaponSchema, WeaponSchemaInput } from './index';
import { WeaponSchema } from '~/types/schema/weapon';

export const createSpearSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'Spear',
    baseMass: 4_000, // 4kg - typical spear mass
    range: {
      optimal: 2,
      max: 2,
    },
  });
};
