import { SchemaLoader } from '~/types/schema/loader';
import { WeaponSchema } from '~/types/schema/weapon';
import { WeaponSchemaURN } from '~/types/taxonomy';
import { longswordSchema, bastardSwordSchema } from '../weapon/sword';
import { warhammerSchema } from '../weapon/warhammer';
import { BARE_HANDS_WEAPON_DO_NOT_DELETE } from '~/worldkit/schema/weapon/bare-hands';
import { pistolSchema, rifleSchema, shotgunSchema } from '~/worldkit/schema/weapon/gun';
import { shortbowSchema, longbowSchema } from '~/worldkit/schema/weapon/bow';

/**
 * Pure function to load all weapon schemas
 * TODO: Implement actual weapon schema loading when weapon schema files are available
 */
export const loadWeaponSchemas: SchemaLoader<WeaponSchemaURN, WeaponSchema> = () => {
  return new Map<WeaponSchemaURN, WeaponSchema>([
    [BARE_HANDS_WEAPON_DO_NOT_DELETE.urn, BARE_HANDS_WEAPON_DO_NOT_DELETE],
    [longswordSchema.urn, longswordSchema],
    [bastardSwordSchema.urn, bastardSwordSchema],
    [warhammerSchema.urn, warhammerSchema],
    [pistolSchema.urn, pistolSchema],
    [rifleSchema.urn, rifleSchema],
    [shotgunSchema.urn, shotgunSchema],
    [shortbowSchema.urn, shortbowSchema],
    [longbowSchema.urn, longbowSchema],
  ]);
};
