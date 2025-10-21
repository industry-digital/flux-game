import { DamageType } from '~/types/damage';
import { createAmmoSchema } from './factory';
import { AmmoSchema } from '~/types/schema/ammo';

export const arrowSchema = createAmmoSchema((schema: AmmoSchema) => ({
  ...schema,
  name: 'arrow',
  baseMass: 60,
  damage: {
    base: '2d6',
    types: {
      [DamageType.KINETIC]: 1.0,
    },
  },
}));
