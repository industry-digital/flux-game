import { Actor } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { getActorSkill, getEffectiveSkillRank } from '~/worldkit/entity/actor/skill';

/**
 * Default AP cost for attack actions
 */
export const DEFAULT_ATTACK_AP_COST = 2;

/**
 * Skill multiplier for attack rating calculation
 * 0.8 creates perfect symmetry: max skill (100) + max roll (1d20) = 81-100 attack rating
 */
export const ATTACK_SKILL_MULTIPLIER = 0.8;

export type CalculateAttackRatingDependencies = {
  getActorSkill: typeof getActorSkill;
  getEffectiveSkillRank: typeof getEffectiveSkillRank;
};

export const DEFAULT_CALCULATE_ATTACK_RATING_DEPS: Readonly<CalculateAttackRatingDependencies> = {
  getActorSkill,
  getEffectiveSkillRank,
};

/**
 * Calculate skill-based attack rating for weapon accuracy
 *
 * Creates symmetric progression with evasion system:
 * - Range: 1-100 (1d20 base + 0-80 skill bonus)
 * - Perfect masters: 100 attack rating vs 100 evasion rating = 50% hit
 * - Typical players: 33-66 rating range for balanced combat
 *
 * @param actor - The attacking actor
 * @param weapon - The weapon being used
 * @param baseRoll - The 1d20 attack roll result
 * @returns Attack rating (1-100)
 */
export const calculateAttackRating = (
  actor: Actor,
  weapon: WeaponSchema,
  baseRoll: number,
  deps: CalculateAttackRatingDependencies = DEFAULT_CALCULATE_ATTACK_RATING_DEPS,
): number => {
  const skillState = deps.getActorSkill(actor, weapon.skill);
  const weaponSkillRank = deps.getEffectiveSkillRank(actor, weapon.skill, skillState);

  // Skill bonus: 0-80 points (rank 0-100 * 0.8 multiplier)
  const skillBonus = weaponSkillRank * ATTACK_SKILL_MULTIPLIER;

  // Base roll (1-20) + skill bonus (0-80) = total rating (1-100)
  const attackRating = baseRoll + skillBonus;

  // Ensure we don't exceed theoretical maximum
  return Math.min(attackRating, 100);
};
