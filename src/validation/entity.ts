import * as typia from 'typia';
import { Entity, EntityType, EntityURN, EmergentNarrative, SymbolicLink } from '@flux';

/**
 * Validator for the base Entity type
 * This validates the structure of any entity regardless of its specific type
 */
export const validateEntity = typia.createValidate<Entity>();

/**
 * Validator for Entity URNs
 * Checks if a string is a properly formatted entity identifier
 */
export const validateEntityURN = typia.createValidate<EntityURN>();

/**
 * Validator for SymbolicLink
 */
export const validateSymbolicLink = typia.createValidate<SymbolicLink<EntityType>>();

/**
 * Validator for EmergentNarrative
 * Checks descriptions with base and emergent components
 */
export const validateEmergentNarrative = typia.createValidate<EmergentNarrative>();
