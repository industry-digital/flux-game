import { AmmoSchema } from '~/types/schema/ammo';
import { createAmmoSchema } from './factory';
import { DamageType } from '~/types/damage';

export const pistolRoundSchema = createAmmoSchema((schema: AmmoSchema) => ({
  ...schema,
  urn: 'flux:schema:ammo:pistol',
  baseMass: 12,
  damage: {
    base: '3d6',
    types: {
      [DamageType.KINETIC]: 1.0,
    },
  },
}));

export const rifleRoundSchema = createAmmoSchema((schema: AmmoSchema) => ({
  ...schema,
  urn: 'flux:schema:ammo:rifle',
  baseMass: 12,
  damage: {
    base: '4d6',
    types: {
      [DamageType.KINETIC]: 1.0,
    },
  },
}));

export const shotgunShellSchema = createAmmoSchema((schema: AmmoSchema) => ({
  ...schema,
  urn: 'flux:schema:ammo:shotgun',
  baseMass: 33,
  damage: {
    base: '5d6',
    types: {
      [DamageType.KINETIC]: 1.0,
    },
  },
}));

export const bulletSchemas = [
  pistolRoundSchema,
  rifleRoundSchema,
  shotgunShellSchema,
];
