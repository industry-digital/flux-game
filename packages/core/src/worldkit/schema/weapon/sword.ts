import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { DamageType } from '~/types/damage';

export const createSwordSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    baseMass: 2_000, // 2kg - typical sword mass
    name: input.name || 'sword',
    skill: 'flux:skill:weapon:melee',
    range: {
      optimal: 1,
      max: 1,
    },
    damageTypes: {
      [DamageType.SLASH]: 0.8,  // Primary slashing damage
      [DamageType.PIERCE]: 0.2, // Some piercing from the point
    },
  });
};

export const longswordSchema = createSwordSchema({
  urn: 'flux:schema:weapon:longsword',
  name: 'longsword',
});

export const bastardSwordSchema = createSwordSchema({
  urn: 'flux:schema:weapon:bastard-sword',
  name: 'bastard sword',
  baseMass: 3_000, // 3kg - heavier than regular sword
});
