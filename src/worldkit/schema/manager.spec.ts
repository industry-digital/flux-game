import { describe, it, expect } from 'vitest';
import { SchemaManager } from './manager';

// Example schema type for testing
type TestSchema = {
  name: string;
  value: number;
};

type TestURN = `test:${string}`;

describe('SchemaManager', () => {
  // Helper to create a test manager with some schemas
  function createTestManager() {
    const schemas = new Map<TestURN, TestSchema>();
    schemas.set('test:schema1', { name: 'Schema 1', value: 1 });
    schemas.set('test:schema2', { name: 'Schema 2', value: 2 });
    schemas.set('test:other:schema3', { name: 'Schema 3', value: 3 });
    return new SchemaManager<TestSchema, TestURN>(schemas);
  }

  describe('constructor', () => {
    it('should create an empty manager when no schemas provided', () => {
      const manager = new SchemaManager<TestSchema, TestURN>();
      expect(() => manager.getSchema('test:nonexistent')).toThrow();
    });

    it('should initialize with provided schemas', () => {
      const manager = createTestManager();
      expect(manager.getSchema('test:schema1')).toEqual({ name: 'Schema 1', value: 1 });
    });
  });

  describe('getSchema', () => {
    const manager = createTestManager();

    it('should return the correct schema for a given URN', () => {
      const schema = manager.getSchema('test:schema1');
      expect(schema).toEqual({ name: 'Schema 1', value: 1 });
    });

    it('should throw error for non-existent schema', () => {
      expect(() => manager.getSchema('test:nonexistent' as TestURN)).toThrow('Schema not found');
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
  });

  describe('getAllSchemas', () => {
    const manager = createTestManager();

    it('should return all schemas', () => {
      const schemas = manager.getAllSchemas();
      expect(schemas).toHaveLength(3); // see createTestManager
    });
  });
});
