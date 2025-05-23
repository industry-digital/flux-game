import { Taxonomy } from '@flux/taxonomy';

export type RequirementType =
  | Taxonomy.Mana
  | Taxonomy.Stats
  | Taxonomy.Skills
  | Taxonomy.Abilities
  | Taxonomy.Anatomy
  | Taxonomy.Items;

export type Requirements = Partial<Record<RequirementType, number>>;
