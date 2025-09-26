import { Taxonomy } from '~/types/taxonomy';

export type RequirementType =
  | Taxonomy.Mana
  | Taxonomy.Stats
  | Taxonomy.Skills
  | Taxonomy.Abilities
  | Taxonomy.Anatomy
  | Taxonomy.Items
  | Taxonomy.Dimensions;

export type AbstractRequirements<T extends RequirementType> = Partial<Record<T, number>>;
export type SkillRequirements = AbstractRequirements<Taxonomy.Skills>;
export type AbilityRequirements = AbstractRequirements<Taxonomy.Abilities>;
export type StatRequirements = AbstractRequirements<Taxonomy.Stats>;
export type ManaRequirements = AbstractRequirements<Taxonomy.Mana>;
export type DimensionRequirements = AbstractRequirements<Taxonomy.Dimensions>;
export type ItemRequirements = AbstractRequirements<Taxonomy.Items>;

export type Requirements =
  | SkillRequirements
  | AbilityRequirements
  | StatRequirements
  | ManaRequirements
  | DimensionRequirements
  | ItemRequirements;
