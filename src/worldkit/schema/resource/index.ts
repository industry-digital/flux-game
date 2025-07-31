import { SchemaManager } from '../manager';
import { ResourceSchema } from '~/types';
import * as fungusSchemas from './fungus';
import * as treeSchemas from './tree';
import * as flowerSchemas from './flower';
import { sluggify } from '~/lib/slug';

type ResourceURN = `flux:resource:${string}:${string}`;

function generatePath(name: string): string {
  return sluggify(name);
}

function getSchemaExports(module: Record<string, any>, moduleName: string): [ResourceURN, ResourceSchema][] {
  return Object.entries(module)
    .filter(([key, value]) =>
      // Only include concrete schema objects, not factory functions
      key.endsWith('Schema') &&
      !key.startsWith('create') &&
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      'provides' in value &&
      'requirements' in value &&
      'growth' in value
    )
    .map(([_, schema]) => {
      // Ensure schema has a path, generate it from name if missing
      if (!('path' in schema)) {
        (schema as any).path = generatePath(schema.name);
      }
      const urn = `flux:resource:${moduleName}:${schema.path}` as ResourceURN;
      return [urn, schema as ResourceSchema] as [ResourceURN, ResourceSchema];
    });
}

export function createSchemaManager(): SchemaManager<ResourceSchema, ResourceURN> {
  const schemaMap = new Map<ResourceURN, ResourceSchema>();

  // Add schemas from each module
  const modules: [Record<string, any>, string][] = [
    [fungusSchemas, 'fungus'],
    [treeSchemas, 'tree'],
    [flowerSchemas, 'flower'],
  ];

  modules.forEach(([module, name]) => {
    const schemas = getSchemaExports(module, name);
    schemas.forEach(([urn, schema]) => {
      schemaMap.set(urn, schema);
    });
  });

  return new SchemaManager<ResourceSchema, ResourceURN>(schemaMap);
}
