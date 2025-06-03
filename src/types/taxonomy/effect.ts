import { Duration } from '~/types/world/time';
import { createEffectUrn } from '~/lib/taxonomy';
import { Intrinsic, EntityURN, Taxonomy } from '~/types';

export type EffectSchema = {
  /**
   * Identifies the effect
   */
  type: Taxonomy.Effects;

  /**
   * How long the effect lasts upon application
   */
  duration: Duration;

  /**
   * Optional human-friendly description for display purposes.
   */
  summary: string;
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
export interface AppliedEffect extends EffectSchema {
  /**
   * The source of the effect (an Entity, a skill, or 'intrinsic').
   */
  origin: EffectOrigin;

  /**
   * When the effect was applied (milliseconds since UNIX epoch).
   */
  ts: number;
}

/**
 * A dictionary of effects applied to an entity, keyed by opaque local IDs.
 */
export type AppliedEffects = Partial<Record<string, AppliedEffect>>;

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
 * Core effect constants
 */
export const EFFECTS = {
  // Category root URNs
  PHYSICAL: createEffectUrn('physical'),
  MENTAL: createEffectUrn('mental'),
  RESOURCE: createEffectUrn('resource'),
  ENHANCEMENT: createEffectUrn('enhancement'),
  ENVIRONMENTAL: createEffectUrn('environmental'),
  SOCIAL: createEffectUrn('social'),
  SYSTEM: createEffectUrn('system'),
} as const;

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

/**
 * Union type of all possible effect URNs
 * Allows any string that starts with one of our effect category prefixes
 */
export type StatusEffect =
  | `${typeof EFFECTS.PHYSICAL}:${string}`
  | `${typeof EFFECTS.MENTAL}:${string}`
  | `${typeof EFFECTS.RESOURCE}:${string}`
  | `${typeof EFFECTS.ENHANCEMENT}:${string}`
  | `${typeof EFFECTS.ENVIRONMENTAL}:${string}`
  | `${typeof EFFECTS.SOCIAL}:${string}`
  | `${typeof EFFECTS.SYSTEM}:${string}`
  | typeof EFFECTS[keyof typeof EFFECTS];
