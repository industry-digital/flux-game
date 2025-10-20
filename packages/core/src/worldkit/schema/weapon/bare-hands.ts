import { DamageModel, DamageType } from '~/types/damage';
import { Stat } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';

export const BARE_HANDS_WEAPON_SCHEMA: WeaponSchema = createWeaponSchema({
  name: 'bare hands',
  urn: 'flux:schema:weapon:bare-hands',
  range: {
    optimal: 1,
    max: 1,
  },
  damage: {
    model: DamageModel.STAT_SCALING,
    stat: Stat.POW,
    base: '1d4',
    efficiency: 0.1,
    types: {
      [DamageType.IMPACT]: 1,
    },
  },
});
