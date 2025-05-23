import * as typia from 'typia';
import { createEntityValidator } from './entity';
import {
  PlaceAttributes,
  PlaceURN,
  PlaceEntityDescriptor,
  PlaceScopedHistoricalEvent,
  Exit,
  EntityType,
} from '@flux';

/**
 * Validator for a complete Place entity
 */
export const validatePlace = createEntityValidator<EntityType.PLACE, PlaceAttributes>(EntityType.PLACE);

/**
 * Validator for PlaceURN
 * Validates that a string is a properly formatted Place identifier
 */
export const validatePlaceURN = typia.createValidate<PlaceURN>();

/**
 * Validator for PlaceAttributes
 * Validates the structure of Place-specific attributes
 */
export const validatePlaceAttributes = typia.createValidate<PlaceAttributes>();

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
