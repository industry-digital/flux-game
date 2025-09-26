import { Requirements } from '~/types/requirement';
import { Taxonomy } from '~/types/taxonomy';
import { AppliedEffect } from '~/types/taxonomy/effect';

export type IntrinsicEffects = Record<string, AppliedEffect>;

/**
 * Mixin for items that can be equipped
 */
export interface Equippable {
  /**
   * The anatomical locations this item occupies while the weapon is equipped.
   */
  fit: Record<Taxonomy.Anatomy, 1>;

  /**
   * Intrinsic efffects that static effects that are continuously in effect on the item
   * They manifest as permanent `effects` on item instances.
   */
  intrinsics?: IntrinsicEffects;

  /**
   * The traits that the item has.
   */
  traits?: Record<Taxonomy.Traits, 1>;

  /**
   * A policy that determines the parts of the equipment have have attachment slots (e.g., runes, mods, etc.)
   * Each attachment slot is a dictionary of allowed attachment types and the number of slots available for that type.
   */
  attachments?: Record<Taxonomy.Anatomy, Record<string, number>>;

  /**
   * Requirements to equip this item (stats, skills, etc.)
   */
  requirements?: Requirements;
}
