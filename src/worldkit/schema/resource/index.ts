import { SchemaManager } from '../manager';
import { BulkResourceSchema, KindOfResource } from '~/types';
import { ResourceURN } from '~/types/taxonomy';
import * as fungusSchemas from './fungus';
import * as treeSchemas from './tree';
import * as flowerSchemas from './flower';
import * as mineralSchemas from './mineral';

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

export function createSchemaManager(): SchemaManager<BulkResourceSchema, ResourceURN> {
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
      schemaMap.set(urn, schema);
    });
  });

  return new SchemaManager<BulkResourceSchema, ResourceURN>(schemaMap);
}

export { createFlowerSchema } from './flower';
export { createFungusSchema } from './fungus';
export { createMineralSchema } from './mineral';
export { createTreeSchema } from './tree';
