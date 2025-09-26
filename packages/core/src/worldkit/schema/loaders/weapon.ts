import { SchemaLoader } from '../manager';
import { WeaponSchema } from '~/types/schema/weapon';
import { WeaponSchemaURN } from '~/types/taxonomy';
import { longswordSchema, bastardSwordSchema } from '../weapon/sword';
import { warhammerSchema } from '../weapon/warhammer';

/**
 * Pure function to load all weapon schemas
 * TODO: Implement actual weapon schema loading when weapon schema files are available
 */
export const loadWeaponSchemas: SchemaLoader<WeaponSchemaURN, WeaponSchema> = () => {
  return new Map<WeaponSchemaURN, WeaponSchema>([
    [longswordSchema.urn, longswordSchema],
    [bastardSwordSchema.urn, bastardSwordSchema],
    [warhammerSchema.urn, warhammerSchema],
  ]);
};
