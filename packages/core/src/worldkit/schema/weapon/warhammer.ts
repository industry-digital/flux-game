import { createWeaponSchema, WeaponSchemaInput } from './index';
import { WeaponSchema } from '~/types/schema/weapon';

export const createWarhammerSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'Warhammer',
    baseMass: 12_000, // 12kg - heavy, devastating weapon
    range: {
      optimal: 1,
      max: 1,
    },
  });
};

export const warhammerSchema = createWarhammerSchema({
  urn: 'flux:schema:weapon:warhammer',
  name: 'Warhammer',
});
