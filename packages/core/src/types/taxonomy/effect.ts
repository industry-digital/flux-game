import { Duration } from '~/types/world/time';
import { Intrinsic, EntityURN, Taxonomy, EffectURN } from '~/types';

export type AppliedEffect = {
};

export type EffectOriginType =
  | Taxonomy.Skills
  | Taxonomy.Abilities
  | Taxonomy.Traits
  | Taxonomy.Items
  | Intrinsic;

export type EffectOrigin = {
  type: EffectOriginType;
  actor?: EntityURN;
};

/**
 * An Effect is a temporary state or condition applied to an Entity.
 */
export interface Effect extends AppliedEffect {
  /**
   * The source of the effect (an Entity, a skill, or 'intrinsic').
   */
  origin: EffectOrigin;

  /**
   * How long the effect lasts upon application
   */
  duration: Duration;

  /**
   * When the effect was applied (milliseconds since UNIX epoch).
   */
  ts: number;
}

/**
 * A dictionary of effects applied to an entity, keyed by opaque local IDs.
 */
export type AppliedEffects = Partial<Record<EffectURN, Effect>>;

/**
 * Core effect categories for our system
 */
export enum EffectCategory {
  /**
   * Physical combat effects (damage, movement, physical states)
   */
  PHYSICAL = 'physical',

  /**
   * Mental and control effects (mind alteration, behavior control)
   */
  MENTAL = 'mental',

  /**
   * Effects related to character resources (mana, stamina, etc.)
   */
  RESOURCE = 'resource',

  /**
   * Beneficial enhancements and buffs
   */
  ENHANCEMENT = 'enhancement',

  /**
   * Environmental and damage type effects
   */
  ENVIRONMENTAL = 'environmental',

  /**
   * Social and multiplayer interaction effects
   */
  SOCIAL = 'social',

  /**
   * System and meta effects
   */
  SYSTEM = 'system',
}

/**
 * Gets the category of an effect
 */
export function getEffectCategory(effectUrn: Taxonomy.Effects): EffectCategory | null {
  const parts = effectUrn.split(':');
  if (parts.length >= 3 && parts[1] === 'effect') {
    return parts[2] as EffectCategory;
  }
  return null;
}
