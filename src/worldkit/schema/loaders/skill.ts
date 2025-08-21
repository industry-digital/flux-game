import { SchemaLoader } from '../manager';
import { SkillSchema } from '~/types/schema/skill';
import { SkillURN } from '~/types/taxonomy';

/**
 * Pure function to load all skill schemas
 * TODO: Implement actual skill schema loading when skill schema files are available
 */
export const loadSkillSchemas: SchemaLoader<SkillURN, SkillSchema> = () => {
  const schemaMap = new Map<SkillURN, SkillSchema>();

  // TODO: Load skill schemas from files/modules
  // For now, return empty map as placeholder

  return schemaMap;
};
