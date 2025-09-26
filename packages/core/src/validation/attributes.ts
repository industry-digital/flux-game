import * as typia from 'typia';
import {
  ModifiableScalarAttribute,
  ModifiableBoundedAttribute,
  NormalizedValueBetweenZeroAndOne,
} from '~/types/entity/attribute';

/**
 * Validator for ModifiableScalarAttribute
 * Checks that the attribute has valid natural and effective values
 */
export const validateModifiableScalarAttribute = typia.createValidate<ModifiableScalarAttribute>();

/**
 * Validator for ModifiableBoundedAttribute
 * Checks that the attribute has valid natural and effective values with bounds
 */
export const validateModifiableBoundedAttribute = typia.createValidate<ModifiableBoundedAttribute>();

/**
 * Validator for NormalizedValueBetweenZeroAndOne
 */
export const validateNormalizedValue = typia.createValidate<NormalizedValueBetweenZeroAndOne>();

/**
 * Type guard to check if a scalar attribute has modifiers
 */
export function hasModifiers(attr: ModifiableScalarAttribute): attr is ModifiableScalarAttribute & { eff: number, mods: Record<string, any> } {
  return 'eff' in attr && 'mods' in attr;
}

/**
 * Type guard to check if a bounded attribute has modifiers
 */
export function hasBoundedModifiers(attr: ModifiableBoundedAttribute): attr is ModifiableBoundedAttribute & { eff: { cur: number, max: number }, mods: Record<string, any> } {
  return 'eff' in attr && 'mods' in attr;
}

/**
 * Creates a valid unmodified scalar attribute
 */
export function createValidScalarAttribute(value: number): ModifiableScalarAttribute {
  return { nat: value, eff: value, mods: {} };
}

/**
 * Creates a valid unmodified bounded attribute
 */
export function createValidBoundedAttribute(current: number, max: number): ModifiableBoundedAttribute {
  return { nat: { cur: current, max }, eff: { cur: current, max }, mods: {} };
}
