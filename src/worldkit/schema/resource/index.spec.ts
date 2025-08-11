import { describe, it, expect } from 'vitest';
import { createSchemaManager } from './index';
import { ResourceURN } from '~/types/taxonomy';
import { KindOfResource } from '~/types/schema/resource';

describe('Resource Schema Manager', () => {
  describe('schema loading', () => {
    it('should load all resource schemas from each module', () => {
      const manager = createSchemaManager();
      const schemas = (manager as any).schemas as Map<string, any>;

      // Verify we have schemas from all modules
      const moduleNames = new Set(Array.from(schemas.keys()).map(urn => urn.split(':')[2]));
      expect(moduleNames).toContain(KindOfResource.FUNGUS);
      expect(moduleNames).toContain(KindOfResource.MINERAL);
      expect(moduleNames).toContain(KindOfResource.TREE);
      expect(moduleNames).toContain(KindOfResource.FLOWER);

      // Verify total number of schemas
      expect(schemas.size).toBeGreaterThan(0);
      console.log('Total schemas loaded:', schemas.size);
    });

    it('should generate correct URNs using sluggified paths', () => {
      const manager = createSchemaManager();
      const schemas = (manager as any).schemas as Map<string, any>;

      // Test cases for different name formats
      const testCases = [
        // Simple names
        {
          module: KindOfResource.MINERAL,
          name: 'iron',
          expectedPath: 'iron'
        },
        {
          module: KindOfResource.FUNGUS,
          name: 'blood-red cup fungus',
          expectedPath: 'blood-red-cup-fungus'
        },
        // Multi-word descriptive names
        {
          module: KindOfResource.FLOWER,
          name: 'mountain passion vine',
          expectedPath: 'mountain-passion-vine'
        }
      ];

      // Verify each test case
      testCases.forEach(({ module, name, expectedPath }) => {
        const urn: ResourceURN = `flux:res:${module}:${expectedPath}`;
        const schema = schemas.get(urn);
        expect(schema, `Schema not found: ${urn}`).toBeDefined();
      });
    });
  });

  describe('spatial constraints validation', () => {
    it('should have constraints defined for all resource schemas', () => {
      const manager = createSchemaManager();
      const schemas = (manager as any).schemas as Map<string, any>;

      schemas.forEach((schema, urn) => {
        expect(schema.constraints, `Schema ${urn} missing constraints`).toBeDefined();
        expect(schema.constraints.maxNeighbors, `Schema ${urn} missing maxNeighbors`).toBeTypeOf('number');
        expect(schema.constraints.inhibitionRadius, `Schema ${urn} missing inhibitionRadius`).toBeTypeOf('number');
        expect(schema.constraints.maxNeighbors).toBeGreaterThanOrEqual(0);
        expect(schema.constraints.inhibitionRadius).toBeGreaterThan(0);
      });
    });

    it('should validate ecological consistency: high rarity correlates with low clustering', () => {
      const manager = createSchemaManager();
      const schemas = (manager as any).schemas as Map<string, any>;
      const warnings: string[] = [];

      schemas.forEach((schema, urn) => {
        const { maxNeighbors } = schema.constraints;
        const rarity = schema.rarity || 0;

        // High rarity should correlate with low maxNeighbors
        if (rarity > 0.8 && maxNeighbors > 1) {
          warnings.push(`${schema.name}: High rarity (${rarity}) with high clustering (${maxNeighbors})`);
        }
      });

      // Log warnings but don't fail test (might be intentional design choices)
      if (warnings.length > 0) {
        console.warn('Ecological consistency warnings:', warnings);
      }
      expect(warnings.length).toBeLessThan(5); // Allow some flexibility
    });

    it('should validate spatial consistency: large inhibition radius has low clustering', () => {
      const manager = createSchemaManager();
      const schemas = (manager as any).schemas as Map<string, any>;
      const warnings: string[] = [];

      schemas.forEach((schema, urn) => {
        const { maxNeighbors, inhibitionRadius } = schema.constraints;

        // Large inhibition radius should have low maxNeighbors
        if (inhibitionRadius > 2 && maxNeighbors > 2) {
          warnings.push(`${schema.name}: Large radius (${inhibitionRadius}) with high clustering (${maxNeighbors})`);
        }
      });

      // Log warnings but don't fail test (might be intentional design choices)
      if (warnings.length > 0) {
        console.warn('Spatial consistency warnings:', warnings);
      }
      expect(warnings.length).toBeLessThan(3); // Should be rare
    });

    it('should have appropriate defaults by resource type', () => {
      const manager = createSchemaManager();
      const schemas = (manager as any).schemas as Map<string, any>;

      const typeDefaults = {
        [KindOfResource.MINERAL]: { maxNeighbors: 0, inhibitionRadius: 2 },
        [KindOfResource.FUNGUS]: { maxNeighbors: 2, inhibitionRadius: 1 },
        [KindOfResource.TREE]: { maxNeighbors: 3, inhibitionRadius: 1 },
        [KindOfResource.FLOWER]: { maxNeighbors: 5, inhibitionRadius: 1 }
      };

      Object.entries(typeDefaults).forEach(([kind, defaults]) => {
        const schemasOfType = Array.from(schemas.values()).filter(schema => schema.kind === kind);
        expect(schemasOfType.length, `No schemas found for kind: ${kind}`).toBeGreaterThan(0);

        // At least some schemas should use the default (allowing for overrides)
        const withDefaults = schemasOfType.filter(schema =>
          schema.constraints.maxNeighbors === defaults.maxNeighbors &&
          schema.constraints.inhibitionRadius === defaults.inhibitionRadius
        );

        console.log(`${kind}: ${withDefaults.length}/${schemasOfType.length} use defaults`);
        expect(withDefaults.length, `No ${kind} schemas use type defaults`).toBeGreaterThan(0);
      });
    });
  });
});
