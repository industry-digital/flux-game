import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { DamageModel, DamageType } from '~/types/damage';
import { Stat } from '~/types/entity/actor';
import { HUMAN_ANATOMY } from '~/types';

export const createBowSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'bow',
    baseMass: 3_000, // 3kg - typical bow mass
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      skill: 'flux:skill:weapon:bow',
      base: '1d20+2',
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.POW,  // Bow damage scales with archer's strength
      base: '1d8',     // Base damage - will be overridden by arrows
      massEffect: 0.1, // Bow mass has minimal effect (arrows do the work)
      types: {
        [DamageType.PIERCE]: 1.0,  // Default type - will be overridden by arrows
      },
    },
    range: {
      optimal: 30,
      falloff: 30,
      max: 100,
    },
    ammo: {
      type: 'flux:schema:ammo:arrow',
      capacity: 1,  // Bows fire one arrow at a time
    },
    timers: {
      fire: 1500,   // Time to draw and release
      reload: 2000, // Time to nock another arrow
    },
    fit: {
      [HUMAN_ANATOMY.LEFT_HAND]: 1,
      [HUMAN_ANATOMY.RIGHT_HAND]: 1,
    },
  });
};
