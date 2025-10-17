import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';
import { TWO_HANDED_FIT } from '~/worldkit/schema/weapon/fit';
import { DamageType } from '~/types/damage';

export const createWarhammerSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'warhammer',
    skill: 'flux:skill:weapon:melee',
    baseMass: 12_000,
    range: {
      optimal: 1,
      max: 1,
    },
    fit: TWO_HANDED_FIT,
    damageTypes: {
      [DamageType.IMPACT]: 1.0,
    },
  });
};

export const warhammerSchema = createWarhammerSchema({
  urn: 'flux:schema:weapon:warhammer',
  name: 'warhammer',
});
