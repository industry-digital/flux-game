import { Stat } from '~/types';
import { DamageModel, DamageType } from '~/types/damage';
import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';

export type WeaponTransformer = (schema: WeaponSchema) => WeaponSchema;
const identity: WeaponTransformer = (schema) => schema;
export const createTestWeapon = (transform: WeaponTransformer = identity): WeaponSchema => {
  return transform(
    createWeaponSchema((schema: WeaponSchema) => ({
      ...schema,
      urn: 'flux:schema:weapon:test',
      skill: 'flux:skill:weapon:test',
      name: 'Test Weapon',
      baseMass: 1_000,
      range: {
        optimal: 1,
      },
      fit: {
        [HumanAnatomy.RIGHT_HAND]: 1,
      },
      accuracy: {
        model: AccuracyModel.SKILL_SCALING,
        skill: 'flux:skill:weapon:melee',
        base: '1d6',
      },
      damage: {
        model: DamageModel.STAT_SCALING,
        stat: Stat.POW,
        massEffect: 0.5,
        base: '1d6',
        types: {
          [DamageType.SLASH]: 1,
        },
      },
    }))
  ) as WeaponSchema;
};
