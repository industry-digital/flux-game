import {
  ResourceURN,
  WeaponURN,
  ArmorURN,
  AbilityURN,
  SkillURN,
  ItemURN
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
import {
  loadResourceSchemas,
  loadWeaponSchemas,
  loadArmorSchemas,
  loadAbilitySchemas,
  loadSkillSchemas,
  loadContainerSchemas,
} from './loaders';

/**
 * Registry mapping URN types to their corresponding schema types
 * This provides compile-time type safety for URN→Schema mappings
 */
type SchemaRegistry = {
  [key: ResourceURN]: BulkResourceSchema | SpecimenResourceSchema;
  [key: WeaponURN]: WeaponSchema;
  [key: ArmorURN]: ArmorSchema;
  [key: AbilityURN]: AbilitySchema;
  [key: SkillURN]: SkillSchema;
  [key: ItemURN]: ContainerSchema;
  // TODO: Add effect, trait schemas when available
  // [key: EffectURN]: EffectSchema;
  // [key: TraitURN]: TraitSchema;
};

/**
 * Pure function type for schema loaders
 * Each schema type provides a pure function that loads its schemas
 */
export type SchemaLoader<TUrn extends string = string, TSchema = any> = () => Map<TUrn, TSchema>;

/**
 * Unified schema manager that handles all schema types with type safety
 * Replaces the generic SchemaManager<T, U> with a unified approach
 */
export class SchemaManager {
  private readonly schemas = new Map<string, unknown>();
  private readonly loaders = new Map<string, SchemaLoader>();
  private loaded = false;

  /**
   * Register a schema loader for a specific schema type
   */
  public registerLoader(
    schemaType: string,
    loader: SchemaLoader
  ): void {
    if (this.loaders.has(schemaType)) {
      throw new Error(`Schema loader for type '${schemaType}' is already registered`);
    }
    this.loaders.set(schemaType, loader);
  }

  /**
   * Load all schemas from registered loaders
   * This should be called once at startup for eager loading
   */
  public loadAllSchemas(): void {
    if (this.loaded) {
      throw new Error('Schemas have already been loaded');
    }

    for (const [schemaType, loader] of this.loaders) {
      try {
        const schemas = loader();
        for (const [urn, schema] of schemas) {
          if (this.schemas.has(urn)) {
            throw new Error(`Duplicate schema URN detected: ${urn}`);
          }
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
   * Get all registered schema types
   * @returns Array of schema type strings
   */
  public getRegisteredSchemaTypes(): string[] {
    return Array.from(this.loaders.keys());
  }
}

const DEFAULT_LOADERS = new Map<string, SchemaLoader>([
  ['resource', loadResourceSchemas],
  ['weapon', loadWeaponSchemas],
  ['armor', loadArmorSchemas],
  ['ability', loadAbilitySchemas],
  ['skill', loadSkillSchemas],
  ['container', loadContainerSchemas],
]);

/**
 * Create a unified schema manager with all schema types registered
 * This is the main factory function for creating schema managers
 */
export function createSchemaManager(
  loaders: Map<string, SchemaLoader> = DEFAULT_LOADERS,
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
