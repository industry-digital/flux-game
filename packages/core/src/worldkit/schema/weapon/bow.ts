import { createWeaponSchema, WeaponSchemaInput } from './factory';
import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { DamageModel } from '~/types/damage';
import { Stat } from '~/types/entity/actor';
import { TWO_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

export const createBowSchema = (input: WeaponSchemaInput): WeaponSchema => {
  return createWeaponSchema({
    ...input,
    name: input.name || 'bow',
    baseMass: 3_000, // 3kg - typical bow mass
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      skill: 'flux:schema:skill:weapon:bow',
      base: '1d20',
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.POW,  // Bow damage scales with archer's strength
      base: '1d8',     // Base damage - will be overridden by arrows
      efficiency: 1.8,
      types: {}, // A bow's damage type is determined by the ammo
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
    fit: TWO_HANDED_FIT,
  });
};
