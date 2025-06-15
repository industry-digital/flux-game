import * as typia from 'typia';
import { createEntityValidator } from './entity';
import {
  ActorStats,
  ActorURN,
  Skills,
  InjuryDescriptor,
  Equipment,
  SkillState,
  EntityType,
  Inventory,
  ActorStat,
} from '@flux';

/**
 * Validator for a complete Character entity
 */
export const validateActor = createEntityValidator(EntityType.ACTOR);

/**
 * Validator for CharacterURN
 */
export const validateActorURN = typia.createValidate<ActorURN>();

/**
 * Validator for CharacterStats
 */
export const validateActorStats = typia.createValidate<ActorStats>();

/**
 * Validator for a single character stat
 */
export const validateActorStat = typia.createValidate<ActorStat>();

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
