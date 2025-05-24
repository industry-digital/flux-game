import { Modifiers } from '~/types/modifier';

type UnmodifiedScalarAttribute = {
  natural: number;
};

type ModifiedScalarAttribute = UnmodifiedScalarAttribute & {
  effective: number;
  modifiers: Modifiers;
};

type BoundedValue = { current: number; max : number };

type UnmodifiedBoundedAttribute = {
  natural: BoundedValue;
};

type ModifiedBoundedAttribute = UnmodifiedBoundedAttribute & {
  effective: BoundedValue;
  modifiers: Modifiers;
};

type UnmodifiedStatefulValueWithFloor = {
  min: number;
  current: number;
};

type UnmodifiedStatefulValueWithCeiling = {
  max: number;
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

export type ModifiableScalarAttribute = UnmodifiedScalarAttribute | ModifiedScalarAttribute;
export type ModifiableBoundedAttribute = UnmodifiedBoundedAttribute | ModifiedBoundedAttribute;
export type StatefulBoundedValue = UnmodifiedStatefulValueWithFloor | UnmodifiedStatefulValueWithCeiling;
