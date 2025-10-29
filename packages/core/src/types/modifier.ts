import { RootNamespace } from '~/types/taxonomy';

/**
 * Normalized value between 0 and 1, representing position on an easing curve
 * 0 = start of effect, 1 = end of effect
 */
export type NormalizedValueBetweenZeroAndOne = number;

type URNLike = `${string}:${string}`;

export type ModifierDuration = number;
export const PERMANENT: ModifierDuration = -1 as const;

/**
 * A Modifier represents an active effect that modifies a dice roll or attribute.
 */
export type Modifier = {
  origin: URNLike;

  /**
   * The modifier value; positive or negative
   */
  value: number;

  /**
   * The modifier duration; milliseconds
   * `-1` means "permanent"
   */
  duration: ModifierDuration;

  /**
   * The moment the modifer took effect; epoch milliseconds
   */
  ts: number;
};

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
export enum ModifierOperationType {
  ADD = 'add',      // +10 bonus
  MULTIPLY = 'multiply', // x1.2 multiplier
  OVERRIDE = 'override',      // Set to exact value
}

export enum ModifierTargetType {
  STAT = 'stat',
  SKILL = 'skill',
  PHYSICS = 'physics',
}

export type ModifierTarget<TModifierTargetType extends ModifierTargetType> = {
  type: TModifierTargetType;
  id: string;
};

export type StaticModifier<TModifierTargetType extends ModifierTargetType = ModifierTargetType.STAT> = {
  urn: `${RootNamespace}:modifier:${TModifierTargetType}:${string}:${string}`;
  target: ModifierTarget<TModifierTargetType>;
  duration: ModifierDuration;
  operation: ModifierOperationType;
  value: number;
};
