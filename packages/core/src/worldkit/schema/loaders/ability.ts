import { SchemaLoader } from '../manager';
import { AbilitySchema } from '~/types/schema/ability';
import { AbilitySchemaURN } from '~/types/taxonomy';

/**
 * Pure function to load all ability schemas
 * TODO: Implement actual ability schema loading when ability schema files are available
 */
export const loadAbilitySchemas: SchemaLoader<AbilitySchemaURN, AbilitySchema> = () => {
  const schemaMap = new Map<AbilitySchemaURN, AbilitySchema>();

  // TODO: Load ability schemas from files/modules
  // For now, return empty map as placeholder

  return schemaMap;
};
