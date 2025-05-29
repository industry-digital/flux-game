import { Taxonomy } from '~/types/taxonomy';

export type RequirementType =
  | Taxonomy.Mana
  | Taxonomy.Stats
  | Taxonomy.Skills
  | Taxonomy.Abilities
  | Taxonomy.Anatomy
  | Taxonomy.Items
  | Taxonomy.Dimensions;

/**
 * Represents an abstract set of "requirements" that must be met.
 */
export type Requirements = Partial<Record<RequirementType, number>>;
