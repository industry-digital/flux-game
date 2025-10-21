import { DamageModel, DamageType } from '~/types/damage';
import { Stat } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';
import { ONE_HANDED_FIT } from '~/worldkit/schema/weapon/fit';

/**
 * Actors "default" to this weapon in combat if an actual weapon is not equipped.
 */
export const BARE_HANDS_WEAPON_DO_NOT_DELETE: WeaponSchema = createWeaponSchema((schema: WeaponSchema) => ({
  ...schema,
  name: 'bare hands',
  urn: 'flux:schema:weapon:bare-hands',
  fit: ONE_HANDED_FIT,
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
}));
