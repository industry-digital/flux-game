import { DamageModel } from '~/types/damage';
import { createWeaponSchema } from './factory';
import { AccuracyModel, WeaponSchema, WeaponTimer } from '~/types/schema/weapon';
import { TWO_HANDED_FIT } from '~/worldkit/schema/weapon/fit';
import { Stat } from '~/types/entity/actor';

export const shortbowSchema = createWeaponSchema((schema: WeaponSchema) => ({
  ...schema,
  name: 'shortbow',
  baseMass: 1_000, // 1kg - typical shortbow mass
  fit: TWO_HANDED_FIT,
  accuracy: {
    ...schema.accuracy,
    model: AccuracyModel.SKILL_SCALING,
    skill: 'flux:schema:skill:weapon:shortbow',
  },
  damage: {
    model: DamageModel.STAT_SCALING,
    stat: Stat.POW,
    base: '2d6',
    efficiency: 1.8,
    types: {}, // determined by ammo damage types
  },
  range: {
    optimal: 20,
    falloff: 20,
    max: 80,
  },
  timers: {
    [WeaponTimer.SETUP]: 2_000,
    [WeaponTimer.AIM]: 2_000,
    [WeaponTimer.ATTACK]: 1_000,
    [WeaponTimer.RELOAD]: 2_000
  },
  ammo: {
    type: 'flux:schema:ammo:arrow',
    capacity: 1,
  },
}));

export const longbowSchema = createWeaponSchema((schema: WeaponSchema) => ({
  ...schema,
  name: 'longbow',
  baseMass: 2_500, // 2.5kg - typical longbow mass
  fit: TWO_HANDED_FIT,
  accuracy: {
    ...schema.accuracy,
    model: AccuracyModel.SKILL_SCALING,
    skill: 'flux:schema:skill:weapon:longbow',
  },
  damage: {
    model: DamageModel.STAT_SCALING,
    stat: Stat.POW,
    base: '3d6',
    efficiency: 2.0,
  },
  range: {
    optimal: 30,
    falloff: 30,
    max: 100,
  },
  ammo: {
    type: 'flux:schema:ammo:arrow',
    capacity: 1,
  },
  timers: {
    [WeaponTimer.SETUP]: 3_000,
    [WeaponTimer.AIM]: 3_000,
    [WeaponTimer.ATTACK]: 1_000,
    [WeaponTimer.RELOAD]: 3_000,
  },
}));
