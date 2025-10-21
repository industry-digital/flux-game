import { Stat } from '~/types';
import { DamageModel, DamageType } from '~/types/damage';
import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';
import { ONE_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

export type WeaponTransformer = (schema: WeaponSchema) => WeaponSchema;
const identity: WeaponTransformer = (schema) => schema;
export const createTestWeapon = (transform: WeaponTransformer = identity): WeaponSchema => {
  return transform(
    createWeaponSchema((schema: WeaponSchema) => ({
      ...schema,
      urn: 'flux:schema:weapon:test',
      skill: 'flux:schema:skill:weapon:melee',
      baseMass: 1_000,
      fit: ONE_HANDED_FIT,
      range: {
        optimal: 1,
      },
      accuracy: {
        model: AccuracyModel.SKILL_SCALING,
        base: '1d6',
      },
      damage: {
        model: DamageModel.STAT_SCALING,
        stat: Stat.POW,
        efficiency: 0.5,
        base: '1d6',
        types: {
          [DamageType.SLASH]: 1,
        },
      },
    }))
  ) as WeaponSchema;
};
