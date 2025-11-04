import { AppliedModifiers } from '~/types/modifier';

type UnmodifiedScalarAttribute = {
};

/**
 * @deprecated Modifier tracking is not done here
 */
type ModifiedScalarAttribute = UnmodifiedScalarAttribute & {
  /**
   * Natural/base value before any modifications
   */
  nat: number;

  /**
   * Effective value after all modifications
   */
  eff: number;

  /**
   * Active modifiers affecting this attribute
   */
  mods?: AppliedModifiers;
};

export type BoundedValue = {
  /**
   * Current value, constrained by max
   */
  cur: number;

  /**
   * Maximum allowed value
   */
  max: number;
};

/**
 * @deprecated Modifier tracking is not done here
 */
type ModifiedBoundedAttribute = {
  /**
   * Natural/base bounded value before modifications
   */
  nat: BoundedValue;
  /**
   * Effective bounded value after modifications
   */
  eff: BoundedValue;

  /**
   * Active modifiers affecting this bounded value
   */
  mods?: AppliedModifiers;
};

type UnmodifiedStatefulValueWithFloor = {
  /**
   * Minimum allowed value
   */
  min: number;

  /**
   * Current value, constrained by min
   */
  current: number;
};

/**
 * A value between 0 and 1, inclusive
 */
export type NormalizedValueBetweenZeroAndOne = number;

/**
 * A value between -1 and 1, inclusive
 */
export type NormalizedBipolarValue = number;

/**
 * @deprecated Modifier tracking is not done here
 */
export type ModifiableScalarAttribute = ModifiedScalarAttribute;
/**
 * @deprecated Modifier tracking is not done here
 */
export type ModifiableBoundedAttribute = ModifiedBoundedAttribute;

export type StatefulBoundedValue = {
  /**
   * Maximum allowed value
   */
  max: number;

  /**
   * Current value, constrained by max
   */
  current: number;
}
