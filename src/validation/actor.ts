import * as typia from 'typia';
import {
  ActorStats,
  AppliedAnatomicalDamage as InjuryDescriptor,
  Equipment,
  Inventory,
  ActorStat,
  Actor,
  Skills,
} from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';
import { SkillState } from '~/types/entity/skill';

/**
 * Validator for a complete Character entity
 */
export const validateActor = typia.createValidate<Actor>();

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
