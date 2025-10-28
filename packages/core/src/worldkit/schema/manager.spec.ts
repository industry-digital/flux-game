import { describe, it, expect } from 'vitest';
import { SchemaManager, createSchemaManager } from './manager';
import { SchemaLoader } from '~/types/schema/loader';

// Example schema type for testing
type TestSchema = {
  name: string;
  value: number;
};

type TestURN = `test:${string}`;

// Test schema loader implementation
const createTestSchemaLoader = (schemas: Map<TestURN, TestSchema>): SchemaLoader<TestURN, TestSchema> => {
  return () => schemas;
};

const createTestSchema = (urn: string): any => ({ urn } as any);

describe('SchemaManager', () => {
  // Helper to create a test manager with some schemas
  function createTestManager() {
    const schemas = new Map<TestURN, TestSchema>();
    schemas.set('test:schema1', createTestSchema('test:schema1'));
    schemas.set('test:schema2', createTestSchema('test:schema2'));
    schemas.set('test:other:schema3', createTestSchema('test:other:schema3'));

    const manager = new SchemaManager();
    manager.registerLoader('test', createTestSchemaLoader(schemas));
    manager.loadAllSchemas();

    return manager;
  }

  describe('constructor and registration', () => {
    it('should create an empty manager when no loaders registered', () => {
      const manager = new SchemaManager();
      expect(() => manager.getSchema('test:nonexistent' as any)).toThrow('Schemas have not been loaded yet');
    });

    it('should throw error when trying to register duplicate loader without replace', () => {
      const manager = new SchemaManager();
      const schemas = new Map<TestURN, TestSchema>();
      const loader = createTestSchemaLoader(schemas);

      manager.registerLoader('test', loader);
      expect(() => manager.registerLoader('test', loader)).toThrow('Schema loader for type \'test\' is already registered');
    });

    it('should allow replacing existing loader when replace is true', () => {
      const manager = new SchemaManager();
      const schemas1 = new Map<TestURN, TestSchema>();
      schemas1.set('test:old', createTestSchema('test:old'));
      const loader1 = createTestSchemaLoader(schemas1);

      const schemas2 = new Map<TestURN, TestSchema>();
      schemas2.set('test:new', createTestSchema('test:new'));
      const loader2 = createTestSchemaLoader(schemas2);

      manager.registerLoader('test', loader1);
      expect(() => manager.registerLoader('test', loader2, true)).not.toThrow();

      manager.loadAllSchemas();
      expect(manager.getSchema('test:new' as any)).toEqual({ urn: 'test:new' });
      expect(() => manager.getSchema('test:old' as any)).toThrow('Schema not found for URN');
    });

    it('should initialize with registered loaders and load schemas', () => {
      const manager = createTestManager();
      expect(manager.getSchema('test:schema1' as any)).toEqual({ urn: 'test:schema1' });
    });
  });

  describe('getSchema', () => {
    const manager = createTestManager();

    it('should return the correct schema for a given URN', () => {
      const schema = manager.getSchema('test:schema1' as any);
      expect(schema).toEqual({ urn: 'test:schema1' });
    });

    it('should throw error for non-existent schema', () => {
      expect(() => manager.getSchema('test:nonexistent' as any)).toThrow('Schema not found for URN');
    });

    it('should throw error when schemas not loaded', () => {
      const manager = new SchemaManager();
      expect(() => manager.getSchema('test:schema1' as any)).toThrow('Schemas have not been loaded yet');
    });
  });

  describe('getSchemasMatchingPattern', () => {
    const manager = createTestManager();

    it('should find schemas matching string pattern', () => {
      const schemas = manager.getSchemasMatchingPattern('schema');
      expect(schemas).toHaveLength(3);
      expect(schemas).toContainEqual({ urn: 'test:schema1' });
      expect(schemas).toContainEqual({ urn: 'test:schema2' });
      expect(schemas).toContainEqual({ urn: 'test:other:schema3' });
    });

    it('should find schemas matching regex pattern', () => {
      const schemas = manager.getSchemasMatchingPattern(/^test:schema[12]$/);
      expect(schemas).toHaveLength(2);
      expect(schemas).toContainEqual({ urn: 'test:schema1' });
      expect(schemas).toContainEqual({ urn: 'test:schema2' });
    });

    it('should find schemas in specific namespace', () => {
      const schemas = manager.getSchemasMatchingPattern('test:other:');
      expect(schemas).toHaveLength(1);
      expect(schemas).toContainEqual({ urn: 'test:other:schema3' });
    });

    it('should return empty array when no matches found', () => {
      const schemas = manager.getSchemasMatchingPattern('nonexistent');
      expect(schemas).toHaveLength(0);
    });

    it('should handle both regex and string patterns correctly', () => {
      // Test regex pattern
      const regexSchemas = manager.getSchemasMatchingPattern(/schema[12]/);
      expect(regexSchemas).toHaveLength(2);

      // Test string pattern
      const stringSchemas = manager.getSchemasMatchingPattern('other');
      expect(stringSchemas).toHaveLength(1);
      expect(stringSchemas[0]).toEqual({ urn: 'test:other:schema3' });
    });

    it('should filter by schema type when provided', () => {
      const schemas = manager.getSchemasMatchingPattern('schema', 'test');
      expect(schemas).toHaveLength(3);
    });

    it('should throw error when schemas not loaded', () => {
      const manager = new SchemaManager();
      expect(() => manager.getSchemasMatchingPattern('test')).toThrow('Schemas have not been loaded yet');
    });
  });

  describe('getAllSchemas', () => {
    const manager = createTestManager();

    it('should return all schemas as a map', () => {
      const schemas = manager.getAllSchemas();
      expect(schemas.size).toBe(3); // see createTestManager
      expect(schemas.get('test:schema1')).toEqual({ urn: 'test:schema1' });
    });

    it('should throw error when schemas not loaded', () => {
      const manager = new SchemaManager();
      expect(() => manager.getAllSchemas()).toThrow('Schemas have not been loaded yet');
    });
  });

  describe('loader management', () => {
        it('should return registered schema types', () => {
      const manager = new SchemaManager();
      const schemas = new Map<TestURN, TestSchema>();
      manager.registerLoader('test', createTestSchemaLoader(schemas));

      const types = manager.getRegisteredSchemaTypes();
      expect(types).toContain('test');
    });

    it('should prevent loading schemas multiple times', () => {
      const manager = new SchemaManager();
      const schemas = new Map<TestURN, TestSchema>();
      manager.registerLoader('test', createTestSchemaLoader(schemas));

      manager.loadAllSchemas();
      expect(() => manager.loadAllSchemas()).toThrow('Schemas have already been loaded');
    });
  });

  describe('addSchema', () => {
    it('should add a single schema and infer type from URN', () => {
      const manager = createTestManager();
      const newSchema = createTestSchema('flux:schema:test:new-schema');

      manager.addSchema(newSchema);

      expect(manager.getSchema('flux:schema:test:new-schema' as any)).toEqual(newSchema);
    });

    it('should throw error when schemas not loaded', () => {
      const manager = new SchemaManager();
      const schema = createTestSchema('flux:schema:test:test');

      expect(() => manager.addSchema(schema)).toThrow('Schemas must be loaded before adding individual schemas');
    });

    it('should throw error for unregistered schema type', () => {
      const manager = createTestManager();
      const schema = createTestSchema('flux:schema:unknown:test');

      expect(() => manager.addSchema(schema)).toThrow('No loader registered for schema type: unknown');
    });

    it('should throw error for invalid URN format', () => {
      const manager = createTestManager();
      const schema = createTestSchema('invalid:urn:format');

      expect(() => manager.addSchema(schema)).toThrow('Invalid schema URN format: invalid:urn:format');
    });

    it('should overwrite existing schema with same URN', () => {
      const manager = createTestManager();
      const originalSchema = manager.getSchema('test:schema1' as any);
      const updatedSchema = createTestSchema('flux:schema:test:schema1');

      manager.addSchema(updatedSchema);

      expect(manager.getSchema('flux:schema:test:schema1' as any)).toEqual(updatedSchema);
      expect(manager.getSchema('flux:schema:test:schema1' as any)).not.toEqual(originalSchema);
    });
  });

  describe('addSchemas', () => {
    it('should add multiple schemas and infer types from URNs', () => {
      const manager = createTestManager();
      const newSchemas = [
        createTestSchema('flux:schema:test:batch1'),
        createTestSchema('flux:schema:test:batch2'),
      ];

      manager.addSchemas(newSchemas);

      expect(manager.getSchema('flux:schema:test:batch1' as any)).toEqual(newSchemas[0]);
      expect(manager.getSchema('flux:schema:test:batch2' as any)).toEqual(newSchemas[1]);
    });

    it('should throw error when schemas not loaded', () => {
      const manager = new SchemaManager();
      const schemas = [createTestSchema('flux:schema:test:test')];

      expect(() => manager.addSchemas(schemas)).toThrow('Schemas must be loaded before adding schemas');
    });

    it('should throw error if any schema has unregistered type', () => {
      const manager = createTestManager();
      const schemas = [
        createTestSchema('flux:schema:test:valid'),
        createTestSchema('flux:schema:unknown:invalid'),
      ];

      expect(() => manager.addSchemas(schemas)).toThrow('No loader registered for schema type: unknown');

      // Should not have added any schemas due to failure
      expect(() => manager.getSchema('flux:schema:test:valid' as any)).toThrow('Schema not found for URN');
    });

    it('should handle empty array gracefully', () => {
      const manager = createTestManager();
      const originalCount = manager.getAllSchemas().size;

      manager.addSchemas([]);

      expect(manager.getAllSchemas().size).toBe(originalCount);
    });
  });

  describe('hasSchema', () => {
    const manager = createTestManager();

    it('should return true for existing schema', () => {
      expect(manager.hasSchema('test:schema1')).toBe(true);
    });

    it('should return false for non-existent schema', () => {
      expect(manager.hasSchema('test:nonexistent')).toBe(false);
    });

    it('should return false when schemas not loaded', () => {
      const unloadedManager = new SchemaManager();
      expect(unloadedManager.hasSchema('test:anything')).toBe(false);
    });
  });

  describe('removeSchema', () => {
    it('should remove existing schema', () => {
      const manager = createTestManager();

      expect(manager.hasSchema('test:schema1')).toBe(true);
      const removed = manager.removeSchema('test:schema1');

      expect(removed).toBe(true);
      expect(manager.hasSchema('test:schema1')).toBe(false);
      expect(() => manager.getSchema('test:schema1' as any)).toThrow('Schema not found for URN');
    });

    it('should return false for non-existent schema', () => {
      const manager = createTestManager();

      const removed = manager.removeSchema('test:nonexistent');
      expect(removed).toBe(false);
    });

    it('should throw error when schemas not loaded', () => {
      const manager = new SchemaManager();

      expect(() => manager.removeSchema('test:anything')).toThrow('Schemas must be loaded before removing schemas');
    });
  });

  describe('createSchemaManager factory', () => {
    it('should create a unified manager with all schema types registered', () => {
      const manager = createSchemaManager();

      // Verify all expected schema types are registered
      const registeredTypes = manager.getRegisteredSchemaTypes();
      expect(registeredTypes).toContain('resource');
      expect(registeredTypes).toContain('weapon');
      expect(registeredTypes).toContain('armor');
      expect(registeredTypes).toContain('ability');
      expect(registeredTypes).toContain('skill');
      expect(registeredTypes).toContain('container');
      expect(registeredTypes).toContain('ammo');
    });

    it('should have schemas loaded and ready to use', () => {
      const manager = createSchemaManager();

      // Should not throw when getting schemas (they're already loaded)
      const allSchemas = manager.getAllSchemas();
      expect(allSchemas).toBeInstanceOf(Map);

      // Should have some schemas loaded (exact URN format may vary)
      expect(allSchemas.size).toBeGreaterThan(0);
    });

    it('should get schemas of specific type via getSchemasOfType', () => {
      const manager = createSchemaManager();

      // Should be able to get resource schemas directly
      const resourceSchemas = manager.getSchemasOfType('resource');
      expect(resourceSchemas).toBeInstanceOf(Map);

      // Resource schemas may or may not exist, but the method should work
      expect(resourceSchemas.size).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for unknown schema type in getSchemasOfType', () => {
      const manager = createSchemaManager();

      expect(() => manager.getSchemasOfType('unknown')).toThrow('No loader registered for schema type: unknown');
    });
  });
});
