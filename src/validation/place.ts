import * as typia from 'typia';
import { createEntityValidator } from './entity';
import {
  PlaceURN,
  PlaceEntityDescriptor,
  PlaceScopedHistoricalEvent,
  Exit,
  EntityType,
} from '@flux';

/**
 * Validator for a complete Place entity
 */
export const validatePlace = createEntityValidator(EntityType.PLACE);

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

/**
 * Validator for PlaceScopedHistoricalEvent
 * Validates historical events that occurred in a Place
 */
export const validateHistoricalEvent = typia.createValidate<PlaceScopedHistoricalEvent>();
