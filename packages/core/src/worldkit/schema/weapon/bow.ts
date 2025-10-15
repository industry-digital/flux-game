import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';

export const createBowSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    baseMass: 3_000, // 3kg - typical bow mass
    range: {
      optimal: 30,
      falloff: 30,
    },
    ...input,
    name: input.name || 'Bow',
  });
};
