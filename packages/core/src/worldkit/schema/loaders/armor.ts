import { SchemaLoader } from '../manager';
import { ArmorSchema } from '~/types/schema/armor';
import { ArmorSchemaURN } from '~/types/taxonomy';

/**
 * Pure function to load all armor schemas
 * TODO: Implement actual armor schema loading when armor schema files are available
 */
export const loadArmorSchemas: SchemaLoader<ArmorSchemaURN, ArmorSchema> = () => {
  const schemaMap = new Map<ArmorSchemaURN, ArmorSchema>();

  // TODO: Load armor schemas from files/modules
  // For now, return empty map as placeholder

  return schemaMap;
};
