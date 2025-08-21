import { SchemaLoader } from '../manager';
import { ContainerSchema } from '~/types/schema/container';
import { ItemURN } from '~/types/taxonomy';

/**
 * Pure function to load all container schemas
 * TODO: Implement actual container schema loading when container schema files are available
 */
export const loadContainerSchemas: SchemaLoader<ItemURN, ContainerSchema> = () => {
  const schemaMap = new Map<ItemURN, ContainerSchema>();

  // TODO: Load container schemas from files/modules
  // For now, return empty map as placeholder

  return schemaMap;
};
