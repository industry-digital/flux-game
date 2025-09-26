import { SchemaLoader } from '../manager';
import { SkillSchema } from '~/types/schema/skill';
import { SkillSchemaURN } from '~/types/taxonomy';

/**
 * Pure function to load all skill schemas
 * TODO: Implement actual skill schema loading when skill schema files are available
 */
export const loadSkillSchemas: SchemaLoader<SkillSchemaURN, SkillSchema> = () => {
  const schemaMap = new Map<SkillSchemaURN, SkillSchema>();

  // TODO: Load skill schemas from files/modules
  // For now, return empty map as placeholder

  return schemaMap;
};
