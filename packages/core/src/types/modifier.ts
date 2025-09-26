import { ActorURN, EffectURN, Intrinsic, ModifierSchemaURN, SkillURN, StatURN } from '~/types/taxonomy';
import { TraitURN } from '~/types/taxonomy';

/**
 * Normalized value between 0 and 1, representing position on an easing curve
 * 0 = start of effect, 1 = end of effect
 */
export type NormalizedValueBetweenZeroAndOne = number;

/**
 * A Modifier represents an active effect that modifies game values.
 * The schema defines all behavior - the instance just tracks position and computed value.
 */
export type Modifier = {
  /**
   * The schema that defines this modifier's behavior, stacking rules,
   * easing curve, duration, bonus type, etc.
   */
  schema: ModifierSchemaURN;

  /**
   * Position on the modifier's easing curve (0.0 to 1.0)
   * - 0.0 = effect just started
   * - 1.0 = effect about to end
   * - For permanent modifiers, this stays at a fixed value (usually 1.0)
   */
  position: NormalizedValueBetweenZeroAndOne;

  /**
   * The computed value at the current position on the easing curve
   * This is calculated from the schema's curve function and peak value
   */
  value: number;

  /**
   * Who applied the modifier
   */
  appliedBy?: ActorURN;
};

/**
 * The various concepts that modify a roll.
 * An `intrinsic` modifier originates from the host object itself, and not from an external
 */
export type ModifierOrigin =
  | SkillURN
  | StatURN
  | EffectURN
  | TraitURN
  | Intrinsic;

/**
 * Modifiers is a dictionary of Modifiers, indexed by opaque IDs.
 */
export type AppliedModifiers = Record<string, Modifier>;

/**
 * Bonus types that determine stacking behavior (inspired by Pathfinder 2E)
 * Only the highest bonus of each type applies - no stacking within type
 */
export enum BonusType {
  // Typed bonuses (don't stack with same type)
  CIRCUMSTANCE = 'flux:bonus:circumstance',    // Situational advantages (cover, flanking, etc.)
  STATUS = 'flux:bonus:status',                // Magical/supernatural effects (spells, abilities)
  ITEM = 'flux:bonus:item',                    // Equipment bonuses (weapon quality, armor, etc.)
  PROFICIENCY = 'flux:bonus:proficiency',      // Skill/training bonuses

  // Special types
  UNTYPED = 'flux:bonus:untyped',             // Always stacks (rare, use sparingly)
  PENALTY = 'flux:bonus:penalty',             // Penalties stack with bonuses but not each other
}

/**
 * How modifiers combine with base values
 */
export enum ModifierApplicationType {
  ADDITIVE = 'additive',      // +10 bonus
  MULTIPLICATIVE = 'multiplicative', // x1.2 multiplier
  OVERRIDE = 'override',      // Set to exact value
}

/**
 * Enhanced modifier that includes bonus type for stacking rules
 */
export type CombatModifier = Modifier & {
  /**
   * Bonus type for Pathfinder 2E-style stacking rules
   */
  bonusType: BonusType;

  /**
   * How this modifier applies to the base value
   */
  applicationType: ModifierApplicationType;

  /**
   * Priority for application order (higher applies later)
   */
  priority: number;
};
