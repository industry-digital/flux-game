import { ScheduledDuration, SpecialDuration } from '~/types/world/time';
import { Self } from '~/types/actor';
import { Taxonomy, Intrinsic, ModifierURN, EntityURN } from '~/types/taxonomy';

export type ModifierBase = {
  /**
   * The type of the modifier.
   * @example `${ROOT_NAMESPACE}:modifier:stat:dex`
   */
  type: ModifierURN;

  /**
   * `intrinsic` means the source of the modifier is the host object itself
   */
  origin: ModifierOrigin;

  /**
   * The value of the modifier. We make no assumptions about what the number means here.
   */
  value: number;
};

export type PermanentModifier = ModifierBase & {
  /**
   * The duration of the modifier. Always `permanent`.
   */
  duration: SpecialDuration.PERMANENT;
};

/**
 * A modifier that has a duration that begins at a fixed moment in time.
 */
export type TemporaryModifier =
  & Omit<PermanentModifier, 'duration'>
  & ScheduledDuration;

/**
 * A Modifier is a numeric adjustment applied to game values based on
 * taxonomic relationships. For example, a skill might provide a +2 modifier
 * to attack calculations, or a trait might give a -1 modifier to damage.
 *
 * Modifiers can be permanent or temporary.
 */
export type Modifier = TemporaryModifier | PermanentModifier;

/**
 * The various concepts that modify a roll.
 * An `intrinsic` modifier originates from the host object itself, and not from an external
 */
export type ModifierOriginType =
  | Taxonomy.Skills
  | Taxonomy.Stats
  | Taxonomy.Effects
  | Taxonomy.Traits
  | Intrinsic;

/**
 * Tracks what created a modifier and optionally which entity was responsible
 * @example { type: '${ROOT_NAMESPACE}:ability:skill:firstaid', actor: '${ROOT_NAMESPACE}:character:player123' }
 * @example { type: 'intrinsic' } // Equipment bonus, no specific actor
 */
export type ModifierOrigin = {
  type: ModifierOriginType;
  actor?: EntityURN | Self;
};

/**
 * Modifiers is a dictionary indexed by modifier types.
 * The keys are opaque IDs.
 */
export type Modifiers = Record<string, Modifier>;

/**
 * A modifier type is a URN that identifies what is being modified
 * @example `${ROOT_NAMESPACE}:modifier:stat:dex`
 */
export type ModifierType = string;

/**
 * A modifier source is a URN that identifies what is causing the modification
 * @example { type: '${ROOT_NAMESPACE}:ability:skill:firstaid', actor: '${ROOT_NAMESPACE}:character:player123' }
 */
export type ModifierSource = {
  type: string;
  actor?: string;
};
