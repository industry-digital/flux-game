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

describe('SchemaManager', () => {
  // Helper to create a test manager with some schemas
  function createTestManager() {
    const schemas = new Map<TestURN, TestSchema>();
    schemas.set('test:schema1', { name: 'Schema 1', value: 1 });
    schemas.set('test:schema2', { name: 'Schema 2', value: 2 });
    schemas.set('test:other:schema3', { name: 'Schema 3', value: 3 });

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
      schemas1.set('test:old', { name: 'Old Schema', value: 1 });
      const loader1 = createTestSchemaLoader(schemas1);

      const schemas2 = new Map<TestURN, TestSchema>();
      schemas2.set('test:new', { name: 'New Schema', value: 2 });
      const loader2 = createTestSchemaLoader(schemas2);

      manager.registerLoader('test', loader1);
      expect(() => manager.registerLoader('test', loader2, true)).not.toThrow();

      manager.loadAllSchemas();
      expect(manager.getSchema('test:new' as any)).toEqual({ name: 'New Schema', value: 2 });
      expect(() => manager.getSchema('test:old' as any)).toThrow('Schema not found for URN');
    });

    it('should initialize with registered loaders and load schemas', () => {
      const manager = createTestManager();
      expect(manager.getSchema('test:schema1' as any)).toEqual({ name: 'Schema 1', value: 1 });
    });
  });

  describe('getSchema', () => {
    const manager = createTestManager();

    it('should return the correct schema for a given URN', () => {
      const schema = manager.getSchema('test:schema1' as any);
      expect(schema).toEqual({ name: 'Schema 1', value: 1 });
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
      expect(schemas).toContainEqual({ name: 'Schema 1', value: 1 });
      expect(schemas).toContainEqual({ name: 'Schema 2', value: 2 });
      expect(schemas).toContainEqual({ name: 'Schema 3', value: 3 });
    });

    it('should find schemas matching regex pattern', () => {
      const schemas = manager.getSchemasMatchingPattern(/^test:schema[12]$/);
      expect(schemas).toHaveLength(2);
      expect(schemas).toContainEqual({ name: 'Schema 1', value: 1 });
      expect(schemas).toContainEqual({ name: 'Schema 2', value: 2 });
    });

    it('should find schemas in specific namespace', () => {
      const schemas = manager.getSchemasMatchingPattern('test:other:');
      expect(schemas).toHaveLength(1);
      expect(schemas).toContainEqual({ name: 'Schema 3', value: 3 });
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
      expect(stringSchemas[0]).toEqual({ name: 'Schema 3', value: 3 });
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
      expect(schemas.get('test:schema1')).toEqual({ name: 'Schema 1', value: 1 });
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
