import { Actor } from '~/types/entity/actor';
import { SkillState } from '~/types/entity/skill';
import { ActorURN, SkillSchemaURN } from '~/types/taxonomy';
import { AppliedModifiers } from '~/types/modifier';
import { PotentiallyImpureOperations } from '~/types/handler';
import { isActiveModifier } from '~/worldkit/entity/modifier';
import { timestamp } from '~/lib/timestamp';

export const MIN_SKILL_RANK = 0;
export const MAX_SKILL_RANK = 100;

const NO_MODIFIERS: AppliedModifiers = Object.freeze({}) as unknown as AppliedModifiers;

export const createDefaultSkillState = (rank: number = 0): SkillState => ({
  xp: 0,
  pxp: 0,
  rank: Math.max(MIN_SKILL_RANK, Math.min(MAX_SKILL_RANK, rank)),
});

export function getActorSkill(
  actor: Actor,
  skill: SkillSchemaURN,
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
  skill: SkillSchemaURN,
): AppliedModifiers {
  // TODO: Implement me
  return NO_MODIFIERS;
}

type SkillComputationDependencies = {
  timestamp: PotentiallyImpureOperations['timestamp'],
};

export const DEFAULT_SKILL_COMPUTATION_DEPS: SkillComputationDependencies = {
  timestamp,
};

/**
 * Calculate the effective skill rank including all modifier bonuses
 * Applies stacking rules and filters expired modifiers
 * @param actor - The actor to query
 * @param skill - The skill URN to calculate effective rank for
 * @returns Effective skill rank (base + modifiers, clamped to valid range)
 */
export function getEffectiveSkillRank(
  actor: Actor,
  skill: SkillSchemaURN,
  baseSkill = getActorSkill(actor, skill),
  modifiers = getActorSkillModifiers(actor, skill),
  deps: SkillComputationDependencies = DEFAULT_SKILL_COMPUTATION_DEPS,
): number {
  const now = deps.timestamp();
  // Single-pass optimization: filter and aggregate in one loop
  let totalBonus = 0;
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (isActiveModifier(modifier, now)) { // Only active modifiers
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
  skill: SkillSchemaURN,
  now: number,
): boolean {
  const modifiers = getActorSkillModifiers(actor, skill);
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (isActiveModifier(modifier, now)) {
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
  skill: SkillSchemaURN,
  modifiers: AppliedModifiers = getActorSkillModifiers(actor, skill),
  now: number,
): number {
  // Single-pass optimization: filter and aggregate in one loop
  let totalBonus = 0;
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (isActiveModifier(modifier, now)) { // Only active modifiers
      totalBonus += modifier.value;
    }
  }

  return totalBonus;
}


/**
 * Set an actor's skill rank directly
 * Directly mutates the actor's skill state
 */
export function setActorSkillRank(
  actor: Actor,
  skillUrn: SkillSchemaURN,
  rank: number,
): void {
  const clampedRank = Math.max(MIN_SKILL_RANK, Math.min(MAX_SKILL_RANK, rank));

  if (!actor.skills[skillUrn]) {
    actor.skills[skillUrn] = createDefaultSkillState(clampedRank);
  } else {
    actor.skills[skillUrn].rank = clampedRank;
  }
}

/**
 * Set multiple actor skills from a record
 * Directly mutates the actor's skill state
 */
export function setActorSkillRanks(
  actor: Actor,
  skills: Record<SkillSchemaURN, number>,
): void {
  for (const skillUrn in skills) {
    const rank = skills[skillUrn as SkillSchemaURN];
    setActorSkillRank(actor, skillUrn as SkillSchemaURN, rank);
  }
}

export type ActorSkillApi = {
  getActorSkill: typeof getActorSkill;
  getActorSkillModifiers: typeof getActorSkillModifiers;
  getEffectiveSkillRank: typeof getEffectiveSkillRank;
  hasActiveSkillModifiers: typeof hasActiveSkillModifiers;
  getSkillModifierBonus: typeof getSkillModifierBonus;
  setActorSkillRank: typeof setActorSkillRank;
  setActorSkillRanks: typeof setActorSkillRanks;
  createDefaultSkillState: typeof createDefaultSkillState;
};

export const createActorSkillApi = (
  modifierCache: Map<string, AppliedModifiers> = new Map<string, AppliedModifiers>(),
  deps: SkillComputationDependencies = DEFAULT_SKILL_COMPUTATION_DEPS,
): ActorSkillApi => {

  // Helper to create cache key
  const createCacheKey = (actorUrn: ActorURN, skillUrn: SkillSchemaURN): string =>
    `${actorUrn}:${skillUrn}`;

  // Memoized getActorSkillModifiers (the expensive operation)
  const memoizedGetActorSkillModifiers = (actor: Actor, skillUrn: SkillSchemaURN): AppliedModifiers => {
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

    getActorSkillModifiers: (actor: Actor, skillUrn: SkillSchemaURN): AppliedModifiers => {
      return memoizedGetActorSkillModifiers(actor, skillUrn);
    },

    getEffectiveSkillRank: (
      actor: Actor,
      skillUrn: SkillSchemaURN,
      baseSkill = getActorSkill(actor, skillUrn),
      modifiers = memoizedGetActorSkillModifiers(actor, skillUrn)
    ): number => {
      return getEffectiveSkillRank(actor, skillUrn, baseSkill, modifiers);
    },

    hasActiveSkillModifiers: (actor: Actor, skillUrn: SkillSchemaURN, now: number): boolean => {
      const modifiers = memoizedGetActorSkillModifiers(actor, skillUrn);
      for (let modifierId in modifiers) {
        const modifier = modifiers[modifierId];
        if (isActiveModifier(modifier, now)) {
          return true;
        }
      }
      return false;
    },

    getSkillModifierBonus: (
      actor: Actor,
      skillUrn: SkillSchemaURN,
      modifiers = memoizedGetActorSkillModifiers(actor, skillUrn),
      now: number,
    ): number => {
      return getSkillModifierBonus(actor, skillUrn, modifiers, now);
    },

    // Mutation functions
    setActorSkillRank,
    setActorSkillRanks,
    createDefaultSkillState,
  };
};
