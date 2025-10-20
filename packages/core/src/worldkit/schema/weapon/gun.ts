import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { DamageType, DamageModel } from '~/types/damage';
import { HUMAN_ANATOMY } from '~/types';

export const createPistolSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'pistol',
    baseMass: 800, // 0.8kg - typical pistol mass
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      skill: 'flux:schema:skill:weapon:pistol',
      base: '1d20',
    },
    damage: {
      model: DamageModel.FIXED,
      base: '2d6+2',
      types: {
        [DamageType.PIERCE]: 1.0,
      },
    },
    range: {
      optimal: 15,
      falloff: 10,
      max: 50,
    },
    ammo: {
      type: 'flux:schema:ammo:9mm',
      capacity: 15,
    },
    timers: {
      fire: 300,
      reload: 6_000,
    },
    fit: {
      [HUMAN_ANATOMY.RIGHT_HAND]: 1,
    },
  });
};

export const createRifleSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'rifle',
    baseMass: 3500, // 3.5kg - typical rifle mass
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      skill: 'flux:schema:skill:weapon:rifle',
      base: '1d20+5',
    },
    damage: {
      model: DamageModel.FIXED,
      base: '2d8+4',
      types: {
        [DamageType.PIERCE]: 1.0,
      },
    },
    range: {
      optimal: 100,
      falloff: 50,
      max: 300,
    },
    ammo: {
      type: 'flux:schema:ammo:rifle',
      capacity: 30,
    },
    timers: {
      fire: 100,
      reload: 3000,
    },
    fit: {
      [HUMAN_ANATOMY.RIGHT_HAND]: 1,
      [HUMAN_ANATOMY.LEFT_HAND]: 1,
    },
  });
};

export const createShotgunSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'shotgun',
    baseMass: 3200, // 3.2kg - typical shotgun mass
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      skill: 'flux:schema:skill:weapon:shotgun',
      base: '1d20+3',
    },
    damage: {
      model: DamageModel.FIXED,
      base: '2d8',  // Base damage - will be overridden by ammo
      types: {
        [DamageType.PIERCE]: 1.0,  // Default type - will be overridden by ammo
      },
    },
    range: {
      optimal: 10,
      falloff: 5,
      max: 25,
    },
    ammo: {
      type: 'flux:schema:ammo:shotgun-shell',
      capacity: 8,
    },
    timers: {
      fire: 800,
      reload: 4000,
    },
    fit: {
      [HUMAN_ANATOMY.RIGHT_HAND]: 1,
      [HUMAN_ANATOMY.LEFT_HAND]: 1,
    },
  });
};

// Concrete weapon instances
export const glock17Schema = createPistolSchema({
  urn: 'flux:schema:weapon:glock-17',
  name: 'Glock 17',
});

export const ak47Schema = createRifleSchema({
  urn: 'flux:schema:weapon:ak-47',
  name: 'AK-47',
  baseMass: 4300, // 4.3kg - heavier than typical rifle
  accuracy: {
    model: AccuracyModel.SKILL_SCALING,
    skill: 'flux:schema:skill:weapon:rifle',
    base: '1d20+2',
  },
});

export const remington870Schema = createShotgunSchema({
  urn: 'flux:schema:weapon:remington-870',
  name: 'Remington 870',
});
