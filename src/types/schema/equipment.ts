import { CharacterStatName } from '~/types/entity/character';
import { Requirements } from '~/types/requirement';
import { RootNamespace, Taxonomy } from '~/types/taxonomy';
import { EffectSchema } from '~/types/taxonomy/effect';

export type IntrinsicEffects = Record<string, EffectSchema>;

export type CoefficientType = `${RootNamespace}:skill:${string}` | `${RootNamespace}:ability:${string}` | `${RootNamespace}:stat:${string}`;

/**
 * Mixin for items that can be equipped
 */
export interface EquipmentMixin {

  /**
   * Natural, unmodified mass of the item in grams
   */
  mass: number;

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

  /**
   * Bonuses or penalties to stats, skills, or abilities.
   * Examples:
   * - 'flux:skill:stealth': 0.5 (50% penalty to stealth)
   * - 'flux:stat:spd': -2 (SPD)
   */
  coeffs?: Record<CoefficientType, number>;
}
