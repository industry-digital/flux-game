import { SchemaLoader } from '../manager';
import { WeaponSchema } from '~/types/schema/weapon';
import { WeaponURN } from '~/types/taxonomy';

/**
 * Pure function to load all weapon schemas
 * TODO: Implement actual weapon schema loading when weapon schema files are available
 */
export const loadWeaponSchemas: SchemaLoader<WeaponURN, WeaponSchema> = () => {
  const schemaMap = new Map<WeaponURN, WeaponSchema>();

  // TODO: Load weapon schemas from files/modules
  // For now, return empty map as placeholder

  return schemaMap;
};
