import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { WeaponSchema } from '~/types/schema/weapon';
import { DamageType } from '~/types/damage';

export const createDaggerSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'dagger',
    baseMass: 500, // 0.5kg - light, fast weapon
    range: {
      optimal: 1,
      max: 1,
    },
    damageTypes: {
      [DamageType.PIERCE]: 0.7, // Primary piercing damage
      [DamageType.SLASH]: 0.3,  // Some slashing capability
    },
  });
};
