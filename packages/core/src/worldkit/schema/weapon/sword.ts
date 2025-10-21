import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { DamageModel, DamageType } from '~/types/damage';
import { Stat } from '~/types/entity/actor';
import { ONE_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

export const createSwordSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    baseMass: 2_000, // 2kg - typical sword mass
    urn: 'flux:schema:weapon:sword',
    skill: 'flux:schema:skill:weapon:melee',
    name: input.name || 'sword',
    fit: ONE_HANDED_FIT,
    range: {
      optimal: 1,
      max: 1,
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.POW,
      base: '2d6',
      efficiency: 0.6,
      types: {
        [DamageType.SLASH]: 1,
      },
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
