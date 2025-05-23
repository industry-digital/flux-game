import * as typia from 'typia';
import {
  ModifiableScalarAttribute,
  ModifiableBoundedAttribute,
  NormalizedValueBetweenZeroAndOne,
} from '@flux';

/**
 * Validator for ModifiableScalarAttribute
 */
export const validateModifiableScalarAttribute = typia.createValidate<ModifiableScalarAttribute>();

/**
 * Validator for ModifiableBoundedAttribute
 */
export const validateModifiableBoundedAttribute = typia.createValidate<ModifiableBoundedAttribute>();

/**
 * Validator for NormalizedValueBetweenZeroAndOne
 */
export const validateNormalizedValue = typia.createValidate<NormalizedValueBetweenZeroAndOne>();

/**
 * Type guard to check if a scalar attribute has modifiers
 */
export function hasModifiers(attr: ModifiableScalarAttribute): attr is ModifiableScalarAttribute & { effective: number, modifiers: Record<string, any> } {
  return 'effective' in attr && 'modifiers' in attr;
}

/**
 * Type guard to check if a bounded attribute has modifiers
 */
export function hasBoundedModifiers(attr: ModifiableBoundedAttribute): attr is ModifiableBoundedAttribute & { effective: { current: number, max: number }, modifiers: Record<string, any> } {
  return 'effective' in attr && 'modifiers' in attr;
}

/**
 * Creates a valid unmodified scalar attribute
 */
export function createValidScalarAttribute(natural: number): ModifiableScalarAttribute {
  return { natural };
}

/**
 * Creates a valid unmodified bounded attribute
 */
export function createValidBoundedAttribute(current: number, max: number): ModifiableBoundedAttribute {
  return { natural: { current, max } };
}
