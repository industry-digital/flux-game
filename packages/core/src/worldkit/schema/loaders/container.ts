import { SchemaLoader } from '~/types/schema/loader';
import { ContainerSchema } from '~/types/schema/container';
import { SchemaURN } from '~/types/taxonomy';

/**
 * Pure function to load all container schemas
 * TODO: Implement actual container schema loading when container schema files are available
 */
export const loadContainerSchemas: SchemaLoader<SchemaURN<'container'>, ContainerSchema> = () => {
  const schemaMap = new Map<SchemaURN<'container'>, ContainerSchema>();

  // TODO: Load container schemas from files/modules
  // For now, return empty map as placeholder

  return schemaMap;
};
