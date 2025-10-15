import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema, WeaponSchemaInput } from './factory';

export const createSwordSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    baseMass: 2_000, // 2kg - typical sword mass
    name: input.name || 'Sword',
    range: {
      optimal: 1,
      max: 1,
    },
  });
};

export const longswordSchema = createSwordSchema({
  urn: 'flux:schema:weapon:longsword',
  name: 'Longsword',
});

export const bastardSwordSchema = createSwordSchema({
  urn: 'flux:schema:weapon:bastard-sword',
  name: 'Bastard Sword',
  baseMass: 3_000, // 3kg - heavier than regular sword
});
