import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { DamageType, Stat } from '~/types';
import { DamageModel } from '~/types/damage';
import { ONE_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

export type WeaponSchemaInput = Partial<WeaponSchema>;

export type WeaponTransformer = (schema: WeaponSchema) => WeaponSchema;

export function createWeaponSchema(inputOrTransform: WeaponSchemaInput | WeaponTransformer): WeaponSchema {
  const defaults: Partial<WeaponSchema> = {
    baseMass: 1000,
    fit: ONE_HANDED_FIT,
    timers: {},
    range: {
      optimal: 1,
      max: 1,
    },
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      skill: 'flux:schema:skill:weapon:melee',
      base: '1d20',
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.POW,
      base: '1d6',
      efficiency: 0.5,
      types: {
        [DamageType.SLASH]: 1.0,
      },
    },
  };

  if (typeof inputOrTransform === 'function') {
    return inputOrTransform(defaults as WeaponSchema);
  }

  return { ...defaults, ...inputOrTransform } as WeaponSchema;
}
