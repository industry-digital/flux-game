import * as typia from 'typia';
import { createEntityValidator } from './entity';
import {
  CharacterStats,
  CharacterStatName,
  CharacterURN,
  Skills,
  InjuryDescriptor,
  Equipment,
  SkillState,
  EntityType,
  Inventory,
} from '@flux';

/**
 * Validator for a complete Character entity
 */
export const validateCharacter = createEntityValidator(EntityType.CHARACTER);

/**
 * Validator for CharacterURN
 */
export const validateCharacterURN = typia.createValidate<CharacterURN>();

/**
 * Validator for CharacterStats
 */
export const validateCharacterStats = typia.createValidate<CharacterStats>();

/**
 * Validator for a single character stat
 */
export const validateCharacterStatName = typia.createValidate<CharacterStatName>();

/**
 * Validator for Skills collection
 */
export const validateSkills = typia.createValidate<Skills>();

/**
 * Validator for a single SkillState
 */
export const validateSkillState = typia.createValidate<SkillState>();

/**
 * Validator for InjuryDescriptor
 */
export const validateInjuryDescriptor = typia.createValidate<InjuryDescriptor>();

/**
 * Validator for Equipment
 */
export const validateEquipment = typia.createValidate<Equipment>();

/**
 * Validator for Inventory
 */
export const validateInventory = typia.createValidate<Inventory>();
