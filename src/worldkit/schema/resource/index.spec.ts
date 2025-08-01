import { describe, it, expect } from 'vitest';
import { createSchemaManager } from './index';
import { ResourceURN } from '~/types/taxonomy';

describe('Resource Schema Manager', () => {
  describe('schema loading', () => {
    it('should load all resource schemas from each module', () => {
      const manager = createSchemaManager();
      const schemas = (manager as any).schemas as Map<string, any>;

      // Verify we have schemas from all modules
      const moduleNames = new Set(Array.from(schemas.keys()).map(urn => urn.split(':')[2]));
      expect(moduleNames).toContain('fungus');
      expect(moduleNames).toContain('mineral');
      expect(moduleNames).toContain('tree');
      expect(moduleNames).toContain('flower');
      expect(moduleNames).toContain('water');

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
          module: 'mineral',
          name: 'iron',
          expectedPath: 'iron'
        },
        // Compound names with spaces
        {
          module: 'water',
          name: 'large pond',
          expectedPath: 'large-pond'
        },
        // Names with special characters
        {
          module: 'fungus',
          name: 'blood-red cup fungus',
          expectedPath: 'blood-red-cup-fungus'
        },
        // Multi-word descriptive names
        {
          module: 'flower',
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
});
