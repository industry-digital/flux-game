import {
  SchemaURN,
  ResourceSchemaURN,
  WeaponSchemaURN,
  ArmorSchemaURN,
  AbilitySchemaURN,
  SkillSchemaURN,
  ContainerSchemaURN,
  ComponentSchemaURN,
  AmmoSchemaURN,
  EffectURN,
} from '~/types/taxonomy';
import {
  BulkResourceSchema,
  SpecimenResourceSchema,
} from '~/types/schema/resource';
import { WeaponSchema } from '~/types/schema/weapon';
import { ArmorSchema } from '~/types/schema/armor';
import { AbilitySchema } from '~/types/schema/ability';
import { SkillSchema } from '~/types/schema/skill';
import { ContainerSchema } from '~/types/schema/container';
import { AmmoSchema } from '~/types/schema/ammo';
import { EffectSchema } from '~/types/schema/effect';
import {
  loadResourceSchemas,
  loadWeaponSchemas,
  loadArmorSchemas,
  loadAbilitySchemas,
  loadSkillSchemas,
  loadContainerSchemas,
  loadAmmoSchemas,
} from './loaders';
import { ComponentSchema } from '~/types/schema/component';
import { SchemaLoader } from '~/types/schema/loader';

/**
 * Registry mapping URN types to their corresponding schema types
 * This provides compile-time type safety for URN→Schema mappings
 */
export type SchemaRegistry = {
  [key: ResourceSchemaURN]: BulkResourceSchema | SpecimenResourceSchema;
  [key: WeaponSchemaURN]: WeaponSchema;
  [key: ArmorSchemaURN]: ArmorSchema;
  [key: AbilitySchemaURN]: AbilitySchema;
  [key: SkillSchemaURN]: SkillSchema;
  [key: ContainerSchemaURN]: ContainerSchema;
  [key: ComponentSchemaURN]: ComponentSchema;
  [key: AmmoSchemaURN]: AmmoSchema;
  [key: EffectURN]: EffectSchema;
};


/**
 * Unified schema manager that handles all schema types with type safety
 * Replaces the generic SchemaManager<T, U> with a unified approach
 */
export class SchemaManager {
  private readonly schemas = new Map<string, unknown>();
  private readonly loaders = new Map<string, SchemaLoader<any, any>>();
  private loaded = false;

  /**
   * Extract schema type from URN
   * URNs follow the pattern: flux:schema:{type}:{name}
   * @param urn The URN to extract type from
   * @returns The schema type
   */
  private extractSchemaTypeFromURN(urn: string): string {
    const parts = urn.split(':');
    if (parts.length < 3 || parts[0] !== 'flux' || parts[1] !== 'schema') {
      throw new Error(`Invalid schema URN format: ${urn}. Expected flux:schema:{type}:{name}`);
    }
    return parts[2];
  }

  /**
   * Register a schema loader for a specific schema type
   */
  public registerLoader<TUrn extends string = SchemaURN>(
    schemaType: string,
    loader: SchemaLoader<TUrn, any>,
    replace: boolean = false,
  ): void {
    if (this.loaders.has(schemaType) && !replace) {
      throw new Error(`Schema loader for type '${schemaType}' is already registered`);
    }
    this.loaders.set(schemaType, loader);
  }

  /**
   * Load all schemas from registered loaders
   * This should be called once at startup for eager loading
   */
  public loadAllSchemas(force: boolean = false): void {
    if (!force && this.loaded) {
      throw new Error('Schemas have already been loaded');
    }

    for (const [schemaType, loader] of this.loaders) {
      try {
        for (const [urn, schema] of loader()) {
          this.schemas.set(urn, schema);
        }
      } catch (error) {
        throw new Error(`Failed to load schemas for type '${schemaType}': ${error}`);
      }
    }

    this.loaded = true;
  }

  /**
   * Get a schema by URN with compile-time type safety
   * @param urn The URN of the schema to retrieve
   * @returns The schema for the given URN
   * @throws Error if schema is not found
   */
  public getSchema<T extends keyof SchemaRegistry>(urn: T): SchemaRegistry[T] {
    if (!this.loaded) {
      throw new Error('Schemas have not been loaded yet. Call loadAllSchemas() first.');
    }

    const schema = this.schemas.get(urn);
    if (!schema) {
      throw new Error(`Schema not found for URN: ${urn}`);
    }
    return schema as SchemaRegistry[T];
  }

  public getSchemaOrFail<T extends keyof SchemaRegistry>(urn: T): SchemaRegistry[T] {
    const schema = this.getSchema(urn);
    if (!schema) {
      throw new Error(`Schema not found for URN: ${urn}`);
    }
    return schema;
  }

  /**
   * Get schemas matching a pattern, optionally filtered by schema type
   * @param pattern String or RegExp pattern to match URNs against
   * @param schemaType Optional schema type filter
   * @returns Array of matching schemas
   */
  public getSchemasMatchingPattern<T extends keyof SchemaRegistry>(
    pattern: string | RegExp,
    schemaType?: string
  ): SchemaRegistry[T][] {
    if (!this.loaded) {
      throw new Error('Schemas have not been loaded yet. Call loadAllSchemas() first.');
    }

    const output: SchemaRegistry[T][] = [];

    for (const [urn, schema] of this.schemas) {
      // Pattern matching
      const regexMatch = pattern instanceof RegExp ? pattern.test(urn) : urn.includes(pattern);
      if (!regexMatch) continue;

      // Optional schema type filtering
      if (schemaType) {
        const loader = this.loaders.get(schemaType);
        if (!loader) continue;

        // Check if this URN belongs to the requested schema type
        const typeSchemas = loader();
        if (!typeSchemas.has(urn as any)) continue;
      }

      output.push(schema as SchemaRegistry[T]);
    }

    return output;
  }

  /**
   * Get all schemas as a map (zero-copy)
   * @returns Map of all URNs to schemas
   */
  public getAllSchemas(): Map<string, unknown> {
    if (!this.loaded) {
      throw new Error('Schemas have not been loaded yet. Call loadAllSchemas() first.');
    }
    return this.schemas;
  }

  /**
   * Get all schemas of a specific type
   * @param schemaType The schema type to filter by (e.g., 'resource', 'weapon')
   * @returns Map of URNs to schemas for the specified type
   */
  public getSchemasOfType<TUrn extends string, TSchema>(
    schemaType: string
  ): Map<TUrn, TSchema> {
    if (!this.loaded) {
      throw new Error('Schemas have not been loaded yet. Call loadAllSchemas() first.');
    }

    const loader = this.loaders.get(schemaType);
    if (!loader) {
      throw new Error(`No loader registered for schema type: ${schemaType}`);
    }

    return loader() as Map<TUrn, TSchema>;
  }

  /**
   * Get all registered schema types
   * @returns Array of schema type strings
   */
  public getRegisteredSchemaTypes(): string[] {
    return Array.from(this.loaders.keys());
  }

  /**
   * Add a single schema to the manager
   * The schema type is inferred from the schema's URN
   * @param schema The schema object (must have a urn property)
   */
  public addSchema<T extends keyof SchemaRegistry>(
    schema: SchemaRegistry[T] & { urn: T }
  ): void {
    if (!this.loaded) {
      throw new Error('Schemas must be loaded before adding individual schemas');
    }

    const schemaType = this.extractSchemaTypeFromURN(schema.urn);
    if (!this.loaders.has(schemaType)) {
      throw new Error(`No loader registered for schema type: ${schemaType}`);
    }

    this.schemas.set(schema.urn, schema);
  }

  /**
   * Add multiple schemas to the manager
   * Schema types are inferred from each schema's URN
   * This operation is atomic - if any schema fails validation, none are added
   * @param schemas Array of schema objects (each must have a urn property)
   */
  public addSchemas<T extends keyof SchemaRegistry>(
    schemas: (SchemaRegistry[T] & { urn: T })[]
  ): void {
    if (!this.loaded) {
      throw new Error('Schemas must be loaded before adding schemas');
    }

    // Validate all schemas first (atomic operation)
    for (const schema of schemas) {
      const schemaType = this.extractSchemaTypeFromURN(schema.urn);
      if (!this.loaders.has(schemaType)) {
        throw new Error(`No loader registered for schema type: ${schemaType}`);
      }
    }

    // Only add schemas if all validations passed
    for (const schema of schemas) {
      this.schemas.set(schema.urn, schema);
    }
  }

  /**
   * Check if a schema exists by URN
   * @param urn The URN to check
   * @returns True if the schema exists, false otherwise
   */
  public hasSchema(urn: string): boolean {
    if (!this.loaded) {
      return false;
    }
    return this.schemas.has(urn);
  }

  /**
   * Remove a schema by URN
   * @param urn The URN of the schema to remove
   * @returns True if the schema was removed, false if it didn't exist
   */
  public removeSchema(urn: string): boolean {
    if (!this.loaded) {
      throw new Error('Schemas must be loaded before removing schemas');
    }
    return this.schemas.delete(urn);
  }
}

const DEFAULT_LOADERS = new Map<string, SchemaLoader<any, any>>([
  ['resource', loadResourceSchemas],
  ['weapon', loadWeaponSchemas],
  ['armor', loadArmorSchemas],
  ['ability', loadAbilitySchemas],
  ['skill', loadSkillSchemas],
  ['container', loadContainerSchemas],
  ['ammo', loadAmmoSchemas],
]);

/**
 * Create a unified schema manager with all schema types registered
 * This is the main factory function for creating schema managers
 */
export function createSchemaManager(
  loaders: Map<string, SchemaLoader<any, any>> = DEFAULT_LOADERS,
): SchemaManager {
  // Import loaders dynamically to avoid circular dependencies
  const manager = new SchemaManager();

  for (const [schemaType, loader] of loaders) {
    manager.registerLoader(schemaType, loader);
  }

  // Eager loading at startup
  manager.loadAllSchemas();

  return manager;
}
