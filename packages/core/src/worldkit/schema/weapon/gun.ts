import { DamageModel } from '~/types/damage';
import { createWeaponSchema } from './factory';
import { AccuracyModel, WeaponSchema, WeaponTimer } from '~/types/schema/weapon';
import { ONE_HANDED_FIT, TWO_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

export const pistolSchema = createWeaponSchema((schema: WeaponSchema) => ({
  ...schema,
  skill: 'flux:schema:skill:weapon:pistol',
  baseMass: 800, // 0.8kg - typical pistol mass
  fit: ONE_HANDED_FIT,
  accuracy: {
    model: AccuracyModel.SKILL_SCALING,
    base: '1d20',
  },
  damage: {
    model: DamageModel.FIXED,
  },
  range: {
    optimal: 15,
    falloff: 10,
    max: 50,
  },
  ammo: {
    type: 'flux:schema:ammo:pistol',
    capacity: 15,
  },
  timers: {
    [WeaponTimer.SETUP]: 1_000,
    [WeaponTimer.AIM]: 3_000,
    [WeaponTimer.ATTACK]: 300,
    [WeaponTimer.RELOAD]: 6_000,
  },
}));

export const rifleSchema = createWeaponSchema((schema: WeaponSchema) => ({
  ...schema,
  skill: 'flux:schema:skill:weapon:rifle',
  baseMass: 3500, // 3.5kg - typical rifle mass
  fit: TWO_HANDED_FIT,
  range: {
    optimal: 100,
    falloff: 50,
    max: 300,
  },
  accuracy: {
    ...schema.accuracy,
    model: AccuracyModel.SKILL_SCALING,
    base: '1d20+5',
  },
  damage: {
    model: DamageModel.FIXED,
  },
  ammo: {
    type: 'flux:schema:ammo:rifle',
    capacity: 30,
  },
  timers: {
    [WeaponTimer.SETUP]: 3_000,
    [WeaponTimer.AIM]: 3_000,
    [WeaponTimer.ATTACK]: 300,
    [WeaponTimer.RELOAD]: 6_000,
  },
}));

export const shotgunSchema = createWeaponSchema((schema: WeaponSchema) => ({
  ...schema,
  skill: 'flux:schema:skill:weapon:shotgun',
  baseMass: 3200, // 3.2kg - typical shotgun mass
  fit: TWO_HANDED_FIT,
  range: {
    optimal: 10,
    falloff: 5,
    max: 25,
  },
  accuracy: {
    ...schema.accuracy,
    model: AccuracyModel.SKILL_SCALING,
  },
  damage: {
    model: DamageModel.FIXED,
  },
  ammo: {
    type: 'flux:schema:ammo:shotgun',
    capacity: 8,
  },
  timers: {
    [WeaponTimer.SETUP]: 3_000,
    [WeaponTimer.AIM]: 2_000,
    [WeaponTimer.ATTACK]: 300,
    [WeaponTimer.RELOAD]: 6_000,
  },
}));
