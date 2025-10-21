import { DamageType } from '~/types/damage';
import { AmmoSchema } from '~/types/schema/ammo';

export type AmmoTransformer = (schema: AmmoSchema) => AmmoSchema;

export function createAmmoSchema(transform: AmmoTransformer): AmmoSchema {
  const defaults: Partial<AmmoSchema> = {
    baseMass: 12, // 12g - typical pistol bullet mass
    capacity: 16,
    damage: {
      base: '3d6',
      types: {
        [DamageType.KINETIC]: 1.0,
      },
    },
  };

  return transform(defaults as AmmoSchema);
}
