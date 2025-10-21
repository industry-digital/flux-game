import { SchemaURN } from '~/types/taxonomy';

/**
 * Base schema that all entity schemas should extend
 * Provides common properties and behaviors shared across all schema types
 */
export type EntitySchemaBase = {
  /**
   * Human-readable name for this schema type
   */
  name: string;

  /**
   * Optional description of what this schema represents
   */
  description?: string;
};

export type EntitySchema<URN extends SchemaURN, TEntityState = any> = EntitySchemaBase & {
  urn: URN;
};

/**
 * Mass resolver function type for computing additional mass based on entity state
 */
export type EntityMassResolver<TEntityState> = (entity: TEntityState) => number;

/**
 * Schema extension that adds mass computation capability
 * All physical entities should extend this instead of BaseEntitySchema directly
 */
export type PhysicalEntitySchema<URN extends SchemaURN, TEntityState = any> = EntitySchema<URN, TEntityState> & {
  /**
   * Base mass of the entity in grams (empty/unloaded state)
   * For simple items, this IS the total mass
   * For complex entities (containers, actors), this is the base mass before contents
   */
  baseMass: number;

  /**
   * Optional function to compute additional mass based on entity state
   * Used for complex entities that have variable mass (containers, actors, etc.)
   * Should return additional mass in grams to add to baseMass
   */
  computeAdditionalMass?: EntityMassResolver<TEntityState>;
};

export type Schema<URN extends SchemaURN, TEntityState = any> =
  | EntitySchema<URN, TEntityState>
  | PhysicalEntitySchema<URN, TEntityState>
