import { SchemaLoader } from '../manager';
import { BulkResourceSchema, KindOfResource } from '~/types';
import { ResourceURN } from '~/types/taxonomy';
import * as fungusSchemas from '../resource/fungus';
import * as treeSchemas from '../resource/tree';
import * as flowerSchemas from '../resource/flower';
import * as mineralSchemas from '../resource/mineral';

/**
 * Extract schema exports from a module, filtering for valid resource schemas
 */
function getSchemaExports(module: Record<string, any>, moduleName: string): [ResourceURN, BulkResourceSchema][] {
  return Object.entries(module)
    .filter(([key, value]) =>
      // Only include schema objects (all exports ending with 'Schema')
      key.endsWith('Schema') &&
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      'slug' in value &&
      'provides' in value &&
      'quantification' in value &&
      'requirements' in value &&
      'growth' in value
    )
    .map(([_, schema]) => {
      const urn: ResourceURN = `flux:res:${schema.kind}:${schema.slug}`;
      return [urn, schema as BulkResourceSchema] as [ResourceURN, BulkResourceSchema];
    });
}

/**
 * Pure function to load all resource schemas
 */
export const loadResourceSchemas: SchemaLoader<ResourceURN, BulkResourceSchema> = () => {
  const schemaMap = new Map<ResourceURN, BulkResourceSchema>();

  // Add schemas from each module
  const modules: [Record<string, any>, string][] = [
    [fungusSchemas, KindOfResource.FUNGUS],
    [treeSchemas, KindOfResource.TREE],
    [flowerSchemas, KindOfResource.FLOWER],
    [mineralSchemas, KindOfResource.MINERAL],
  ];

  modules.forEach(([module, name]) => {
    const schemas = getSchemaExports(module, name);
    schemas.forEach(([urn, schema]) => {
      if (schemaMap.has(urn)) {
        throw new Error(`Duplicate resource schema URN detected: ${urn}`);
      }
      schemaMap.set(urn, schema);
    });
  });

  return schemaMap;
};
