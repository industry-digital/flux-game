import { createWeaponSchema, WeaponSchemaInput } from './index';
import { WeaponSchema } from '~/types/schema/weapon';

export const createDaggerSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'Dagger',
    baseMass: 500, // 0.5kg - light, fast weapon
    range: {
      optimal: 1,
      max: 1,
    },
  });
};
