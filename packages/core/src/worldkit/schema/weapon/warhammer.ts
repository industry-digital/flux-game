import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';
import { TWO_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

export const createWarhammerSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'warhammer',
    baseMass: 12_000, // 12kg - heavy, devastating weapon
    range: {
      optimal: 1,
      max: 1,
    },
    fit: TWO_HANDED_FIT,
  });
};

export const warhammerSchema = createWarhammerSchema({
  urn: 'flux:schema:weapon:warhammer',
  name: 'Warhammer',
});
