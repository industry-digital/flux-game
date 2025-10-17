import { DamageType } from '~/types/damage';
import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';

export const BARE_HANDS_WEAPON_SCHEMA: WeaponSchema = createWeaponSchema({
  name: 'bare hands',
  urn: 'flux:schema:weapon:bare-hands',
  skill: 'flux:skill:weapon:unarmed',
  range: {
    optimal: 1,
    max: 1,
  },
  damageTypes: {
    [DamageType.IMPACT]: 1,
  },
});
