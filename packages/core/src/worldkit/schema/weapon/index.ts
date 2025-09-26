import { WeaponSchema } from '~/types/schema/weapon';
import { HUMAN_ANATOMY } from '~/types';
import { WeaponSchemaURN } from '~/types/taxonomy';

export type WeaponSchemaInput = Partial<WeaponSchema> & {
  urn: WeaponSchemaURN;
  name: string;
  baseMass?: number;
  fit?: WeaponSchema['fit'];
};

export function createWeaponSchema(input: WeaponSchemaInput): WeaponSchema {
  return {
    // Required fields with defaults
    skill: 'flux:skill:weapon:melee',// FIXME: should be input.skill
    range: {
      optimal: 1,
      max: 1,
    },
    timers: {},
    baseMass: input.baseMass || 1000,
    fit: input.fit || {
      [HUMAN_ANATOMY.RIGHT_HAND]: 1,
    },
    // Spread input to allow overrides
    ...input,
  };
}

// Export all specific weapon creation factories
export { createBowSchema } from './bow';
export { createDaggerSchema } from './dagger';
export { createSpearSchema } from './spear';
export { createSwordSchema } from './sword';
export { createWarhammerSchema } from './warhammer';
