import { Modifiers } from '~/types/modifier';

type UnmodifiedScalarAttribute = {
  /**
   * Natural/base value before any modifications
   */
  nat: number;
};

type ModifiedScalarAttribute = UnmodifiedScalarAttribute & {
  /**
   * Effective value after all modifications
   */
  eff: number;

  /**
   * Active modifiers affecting this attribute
   */
  mods: Modifiers;
};

type BoundedValue = {
  /**
   * Current value, constrained by max
   */
  cur: number;

  /**
   * Maximum allowed value
   */
  max: number;
};

type UnmodifiedBoundedAttribute = {
  /**
   * Natural/base bounded value before modifications
   */
  nat: BoundedValue;
};

type ModifiedBoundedAttribute = UnmodifiedBoundedAttribute & {
  /**
   * Effective bounded value after modifications
   */
  eff: BoundedValue;

  /**
   * Active modifiers affecting this bounded value
   */
  mods: Modifiers;
};

type UnmodifiedStatefulValueWithFloor = {
  /**
   * Minimum allowed value
   */
  min: number;

  /**
   * Current value, constrained by min
   */
  cur: number;
};

type UnmodifiedStatefulValueWithCeiling = {
  /**
   * Maximum allowed value
   */
  max: number;

  /**
   * Current value, constrained by max
   */
  cur: number;
};

/**
 * A value between 0 and 1, inclusive
 */
export type NormalizedValueBetweenZeroAndOne = number;

/**
 * A value between -1 and 1, inclusive
 */
export type NormalizedBipolarValue = number;

export type ModifiableScalarAttribute = UnmodifiedScalarAttribute | ModifiedScalarAttribute;
export type ModifiableBoundedAttribute = UnmodifiedBoundedAttribute | ModifiedBoundedAttribute;
export type StatefulBoundedValue = UnmodifiedStatefulValueWithFloor | UnmodifiedStatefulValueWithCeiling;
