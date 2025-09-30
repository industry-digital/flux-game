import { SkillURN, Taxonomy } from '~/types/taxonomy';
import { Equippable } from '~/types/schema/equipment';
import { AbstractItemSchema } from '~/types/schema/item';

/**
 * Complete attributes for a weapon item
 */
export type ComponentSchema  =
& AbstractItemSchema<'component'>
& Equippable
& {

  /**
   * The skill that modifies the weapon's effectiveness
   */
  skill: SkillURN;

  /**
   * The anatomical locations this item occupies while the weapon is equipped.
   */
  fit?: Partial<Record<Taxonomy.Anatomy, 1>>;
};
