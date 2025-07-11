import * as typia from 'typia';
import { PlaceURN } from '~/types/taxonomy';
import { PlaceEntityDescriptor, Exit, Place } from '~/types/entity/place';

/**
 * Validator for a complete Place entity
 */
export const validatePlace = typia.createValidate<Place>();

/**
 * Validator for PlaceURN
 * Validates that a string is a properly formatted Place identifier
 */
export const validatePlaceURN = typia.createValidate<PlaceURN>();

/**
 * Validator for Exit
 * Validates connections between Places
 */
export const validateExit = typia.createValidate<Exit>();

/**
 * Validator for PlaceEntityDescriptor
 * Validates entity descriptors within a Place
 */
export const validatePlaceEntityDescriptor = typia.createValidate<PlaceEntityDescriptor>();
