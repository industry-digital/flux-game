import { Actor } from '~/types/entity/actor';
import { SkillState } from '~/types/entity/skill';
import { ActorURN, SkillURN } from '~/types/taxonomy';
import { AppliedModifiers } from '~/types/modifier';

export const MIN_SKILL_RANK = 0;
export const MAX_SKILL_RANK = 100;

export const createDefaultSkillState = (): SkillState => ({
  xp: 0,
  pxp: 0,
  rank: 0,
});

export function getActorSkill(
  actor: Actor,
  skill: SkillURN,
): SkillState {
  if (!actor.skills) {
    throw new Error('Actor has no skills');
  }
  return actor.skills[skill] ?? createDefaultSkillState();
}

/**
 * Extract all modifiers affecting a specific skill
 * @param actor - The actor to query
 * @param skill - The skill URN to get modifiers for
 * @returns Array of active modifiers for the skill
 */
export function getActorSkillModifiers(
  actor: Actor,
  skill: SkillURN,
): AppliedModifiers {
  if (!actor.skills) {
    return {};
  }
  const skillState = actor.skills[skill];
  return skillState?.mods ?? {};
}

/**
 * Calculate the effective skill rank including all modifier bonuses
 * Applies stacking rules and filters expired modifiers
 * @param actor - The actor to query
 * @param skill - The skill URN to calculate effective rank for
 * @returns Effective skill rank (base + modifiers, clamped to valid range)
 */
export function getEffectiveSkillRank(
  actor: Actor,
  skill: SkillURN,
  baseSkill = getActorSkill(actor, skill),
  modifiers = getActorSkillModifiers(actor, skill),
): number {
  // Single-pass optimization: filter and aggregate in one loop
  let totalBonus = 0;
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) { // Only active modifiers
      totalBonus += modifier.value;
    }
  }

  // Clamp to valid skill rank range
  return Math.max(MIN_SKILL_RANK, Math.min(MAX_SKILL_RANK, baseSkill.rank + totalBonus));
}

/**
 * Check if an actor has any active modifiers on a skill
 * @param actor - The actor to query
 * @param skill - The skill URN to check
 * @returns True if the skill has active (non-expired) modifiers
 */
export function hasActiveSkillModifiers(
  actor: Actor,
  skill: SkillURN,
): boolean {
  const modifiers = getActorSkillModifiers(actor, skill);
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Get the total modifier bonus for a skill (for debugging/UI)
 * @param actor - The actor to query
 * @param skill - The skill URN to calculate bonus for
 * @param modifiers - Optional pre-extracted modifiers array for performance
 * @returns Total modifier bonus (positive or negative)
 */
export function getSkillModifierBonus(
  actor: Actor,
  skill: SkillURN,
  modifiers: AppliedModifiers = getActorSkillModifiers(actor, skill),
): number {
  // Single-pass optimization: filter and aggregate in one loop
  let totalBonus = 0;
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) { // Only active modifiers
      totalBonus += modifier.value;
    }
  }

  return totalBonus;
}

export type ActorSkillApi = {
  getActorSkill: typeof getActorSkill;
  getActorSkillModifiers: typeof getActorSkillModifiers;
  getEffectiveSkillRank: typeof getEffectiveSkillRank;
  hasActiveSkillModifiers: typeof hasActiveSkillModifiers;
  getSkillModifierBonus: typeof getSkillModifierBonus;
};

export const createActorSkillApi = (
  modifierCache: Map<string, AppliedModifiers> = new Map<string, AppliedModifiers>(),
): ActorSkillApi => {

  // Helper to create cache key
  const createCacheKey = (actorUrn: ActorURN, skillUrn: SkillURN): string =>
    `${actorUrn}:${skillUrn}`;

  // Memoized getActorSkillModifiers (the expensive operation)
  const memoizedGetActorSkillModifiers = (actor: Actor, skillUrn: SkillURN): AppliedModifiers => {
    const cacheKey = createCacheKey(actor.id, skillUrn);
    const cachedModifiers = modifierCache.get(cacheKey);

    if (cachedModifiers) {
      return cachedModifiers;
    }

    const modifiers = getActorSkillModifiers(actor, skillUrn);
    modifierCache.set(cacheKey, modifiers);
    return modifiers;
  };

  return {
    getActorSkill,

    getActorSkillModifiers: (actor: Actor, skillUrn: SkillURN): AppliedModifiers => {
      return memoizedGetActorSkillModifiers(actor, skillUrn);
    },

    getEffectiveSkillRank: (
      actor: Actor,
      skillUrn: SkillURN,
      baseSkill = getActorSkill(actor, skillUrn),
      modifiers = memoizedGetActorSkillModifiers(actor, skillUrn)
    ): number => {
      return getEffectiveSkillRank(actor, skillUrn, baseSkill, modifiers);
    },

    hasActiveSkillModifiers: (actor: Actor, skillUrn: SkillURN): boolean => {
      const modifiers = memoizedGetActorSkillModifiers(actor, skillUrn);
      for (let modifierId in modifiers) {
        const modifier = modifiers[modifierId];
        if (modifier.position < 1.0) {
          return true;
        }
      }
      return false;
    },

    getSkillModifierBonus: (
      actor: Actor,
      skillUrn: SkillURN,
      modifiers = memoizedGetActorSkillModifiers(actor, skillUrn)
    ): number => {
      return getSkillModifierBonus(actor, skillUrn, modifiers);
    },
  };
};
