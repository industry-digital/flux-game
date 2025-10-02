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

  /**
   * The power draw of the component in watts
   * Directly counteracts the actor's peak power output
   * Free Power = Peak Power Output - (sum of all component power draw)
   */
  powerDraw?: number;
};
