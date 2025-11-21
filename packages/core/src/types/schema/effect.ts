import { EffectURN } from '~/index';

/**
 * Effect categories for different types of applied effects
 */
export enum EffectCategory {
  /**
   * Status conditions (death, paralysis, invisibility)
   */
  CONDITION = 'condition',

  /**
   * Attribute modifications (buffs, debuffs)
   */
  MODIFIER = 'modifier',

  /**
   * Damage or healing over time
   */
  TEMPORAL = 'temporal',

  /**
   * Environmental effects (weather, lighting)
   */
  ENVIRONMENTAL = 'environmental',

  /**
   * Aura effects that affect nearby entities
   */
  AURA = 'aura',
}

/**
 * Easing curves for effect interpolation
 */
export enum EffectCurve {
  /**
   * Linear progression from start to end
   * f(t) = t
   */
  LINEAR = 'linear',

  /**
   * Slow start, accelerating finish
   * f(t) = t²
   */
  EASE_IN = 'easeIn',

  /**
   * Fast start, decelerating finish
   * f(t) = 1 - (1-t)²
   */
  EASE_OUT = 'easeOut',

  /**
   * Slow start and finish, fast middle
   */
  EASE_IN_OUT = 'easeInOut',

  /**
   * Bouncing effect
   */
  BOUNCE = 'bounce',

  /**
   * Elastic spring effect
   */
  ELASTIC = 'elastic',

  /**
   * Instant transition at completion
   * f(t) = t >= 1.0 ? 1.0 : 0.0
   */
  STEP = 'step',

  /**
   * Constant zero value throughout duration
   * f(t) = 0.0 (stays at startValue)
   */
  FLATLINE_ZERO = 'flatline_zero',

  /**
   * Constant one value throughout duration
   * f(t) = 1.0 (jumps to endValue immediately)
   */
  FLATLINE_ONE = 'flatline_one',

  /**
   * Sine wave progression
   */
  SINE = 'sine',

  /**
   * Exponential progression
   */
  EXPONENTIAL = 'exponential',
}

export enum EffectTerminationCondition {
  ENDS_ON_DEATH = 'death:ends',
  ENDS_ON_RESPAWN = 'respawn:ends',

  // Movement-based
  ENDS_ON_MOVEMENT = 'movement:ends',
  STARTS_ON_MOVEMENT = 'movement:starts',  // Future: effects that activate on movement

  // Damage-based
  ENDS_ON_DAMAGE = 'damage:ends',
  ENDS_ON_HEALING = 'healing:ends',

  // Combat state
  ENDS_ON_COMBAT_START = 'combat:starts:ends',
  ENDS_ON_COMBAT_END = 'combat:ends:ends',

  // Social interactions
  ENDS_ON_SPEECH = 'social:speech:ends',
  ENDS_ON_TRADE = 'social:trade:ends',

  // Magic system
  ENDS_ON_DISPEL = 'magic:dispel:ends',
  ENDS_ON_SPELL_CAST = 'magic:cast:ends',

  // Environmental
  ENDS_ON_ZONE_CHANGE = 'environment:zone:ends',
  ENDS_ON_WEATHER_CHANGE = 'environment:weather:ends',
}

export type LifecycleHints = Partial<Record<EffectTerminationCondition, 1>>;

/**
 * Visual and audio presentation configuration
 */
export type EffectPresentation = {
  /**
   * Icon identifier for UI display
   * See `@flux/ui` package for available icons
   */
  icon: string;

  /**
   * Color hex code for visual effects
   */
  color: string;
};

/**
 * Schema definition for an effect type
 *
 * Defines the template/blueprint for how effects of this type behave.
 * Individual AppliedEffect instances reference these schemas and can
 * override specific properties when needed.
 */
export type EffectSchema = {
  /**
   * Unique schema identifier
   * Effect category is directly computable from the URN
   */
  urn: EffectURN;

  /**
   * Default curve behavior
   */
  curve: EffectCurve;

  /**
   * Default duration in milliseconds (-1 for permanent)
   */
  duration: number;

  /**
   * Termination conditions
   */
  lifecycle?: LifecycleHints;

  /**
   * Visual and audio presentation
   */
  presentation?: EffectPresentation;
};
