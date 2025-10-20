import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';
import { TWO_HANDED_FIT } from '~/worldkit/schema/weapon/fit';
import { DamageModel, DamageType } from '~/types/damage';
import { Stat } from '~/types/entity/actor';

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
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.POW,
      base: '3d6',
      massEffect: 1.0,
      types: {
        [DamageType.IMPACT]: 1.0,
      },
    },
  });
};

export const warhammerSchema = createWarhammerSchema({
  urn: 'flux:schema:weapon:warhammer',
  name: 'warhammer',
});
