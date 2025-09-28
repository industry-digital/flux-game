import { WeaponSchema } from '~/types/schema/weapon';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';

export type WeaponTransformer = (schema: WeaponSchema) => WeaponSchema;
const identity: WeaponTransformer = (schema) => schema;
export const createTestWeapon = (transform: WeaponTransformer = identity): WeaponSchema => {
  return transform({
    urn: 'flux:schema:weapon:test',
    skill: 'flux:skill:weapon:test',
    name: 'Test Weapon',
    baseMass: 1_000,
    range: {
      optimal: 1,
    },
    fit: {
      [HumanAnatomy.RIGHT_HAND]: 1,
    },
  });
};
