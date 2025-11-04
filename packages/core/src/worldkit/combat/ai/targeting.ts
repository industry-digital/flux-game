import { Combatant, CombatSession, ResolvedTarget } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { Actor } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { ActorURN } from '~/types/taxonomy';
import { computeDistanceBetweenCombatants } from '~/worldkit/combat/range';
import { canWeaponHitFromDistance } from '~/worldkit/combat/weapon';
import { getHealthPercentage, isActorAlive } from '~/worldkit/entity/actor';
import { CombatPlanningDependencies, DEFAULT_COMBAT_PLANNING_DEPS } from '~/worldkit/combat/ai/deps';

export type TargetingApi = {
  chooseTargetForActor: (actorId: ActorURN) => ResolvedTarget;
};

/**
 * Creates a targeting hook that provides target selection for combatants
 */

export const targetingApi = (
  context: TransformerContext,
  session: CombatSession,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): TargetingApi => {
  const {
    chooseTarget: chooseTargetImpl = chooseTarget,
    filterValidTargets: filterValidTargetsImpl = filterValidTargets,
    computeDistanceBetweenCombatants: computeDistanceBetweenCombatantsImpl = computeDistanceBetweenCombatants,
    canWeaponHitFromDistance: canWeaponHitFromDistanceImpl = canWeaponHitFromDistance,
    isActorAlive: isActorAliveImpl = isActorAlive,
  } =  deps;

  const { actors } = context.world;
  const { combatants } = session.data;

  const chooseTargetForActor = (actorId: ActorURN): ResolvedTarget => {
    const actor = actors[actorId];
    if (!actor) {
      throw new Error(`Actor ${actorId} not found in world projection`);
    }

    const combatant = combatants.get(actorId);
    if (!combatant) {
      throw new Error(`Actor ${actorId} not found in combatants`);
    }

    const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);
    if (!weapon) {
      throw new Error(`Actor ${actorId} has no weapon`);
    }

    // Target persistence: If the combatant already has a target, and that target is within range, keep attacking that target.
    if (combatant.target) {
      const target = combatants.get(combatant.target);

      if (target) {
        const targetActor = actors[target.actorId];
        if (targetActor && isActorAliveImpl(targetActor)) {
        const distance = computeDistanceBetweenCombatantsImpl(combatant, target);
        if (canWeaponHitFromDistanceImpl(weapon, distance)) {
              return { actorId: target.actorId, distance };
            }
          }
      }
  }

    // Find all valid targets
  const validTargets = filterValidTargetsImpl(actors, combatants, combatant, deps);
  if (validTargets.length === 0) {
      throw new Error('No valid targets available');
  }

  // Unified targeting algorithm that works for all weapon types
  return chooseTargetImpl(validTargets, combatant, weapon);
  };

  return {
    chooseTargetForActor,
  };
};

// Helper types
type TargetCandidate = {
  actorId: ActorURN;
  actor: Actor;
  combatant: Combatant;
  distance: number;
};

// Helper functions
export function filterValidTargets(
  actors: Record<ActorURN, Actor>,
  combatants: Map<ActorURN, Combatant>,
  combatant: Combatant,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): TargetCandidate[] {
  const {
    isActorAlive: isActorAliveImpl = isActorAlive,
    computeDistanceBetweenCombatants: computeDistanceBetweenCombatantsImpl = computeDistanceBetweenCombatants,
  } = deps;

  // Pre-allocate array with estimated size to reduce reallocations
  // Most combat scenarios have 2-10 combatants, so 8 is a reasonable estimate
  const candidates: TargetCandidate[] = [];
  candidates.length = 0; // Ensure it starts empty but has capacity

  for (const [targetActorId, targetCombatant] of combatants) {
    // Skip self
    if (targetActorId === combatant.actorId) continue;

    const targetActor = actors[targetActorId];
    if (!targetActor) continue;

    // Skip dead actors
    if (!isActorAliveImpl(targetActor)) continue;

    // Skip allies - optimize by avoiding redundant map lookups
    // We already have both combatants, so compare teams directly
    if (combatant.team === targetCombatant.team) continue;

    // Compute distance once and reuse
    const distance = computeDistanceBetweenCombatantsImpl(combatant, targetCombatant);

    // Create candidate object - this allocation is unavoidable for the current API
    // but we minimize other allocations
    candidates.push({
      actorId: targetActorId,
      actor: targetActor,
      combatant: targetCombatant,
      distance,
    });
  }

  return candidates;
}

export function chooseTarget(
  candidates: TargetCandidate[],
  combatant: Combatant,
  weapon: WeaponSchema,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): ResolvedTarget {
  const {
    canWeaponHitFromDistance: canWeaponHitFromDistanceImpl = canWeaponHitFromDistance,
  } = deps;

  const optimalRange = weapon.range?.optimal || 1;
  const hasFalloff = !!weapon.range?.falloff;
  const optimalTolerance = hasFalloff ? 2 : 0.5;

  // Zero-allocation single-pass algorithm
  let bestInRange: TargetCandidate | null = null;
  let bestOptimal: TargetCandidate | null = null;
  let closestOverall: TargetCandidate | null = null;
  let bestInRangeScore = Infinity;
  let bestOptimalHp = Infinity;
  let closestDistance = Infinity;

  // Single pass through candidates - no array allocations
  for (const candidate of candidates) {
    // Track closest overall for movement fallback
    if (candidate.distance < closestDistance) {
      closestDistance = candidate.distance;
      closestOverall = candidate;
    }

    const canHit = canWeaponHitFromDistanceImpl(weapon, candidate.distance);
    if (!canHit) continue;

    // Check if at optimal range
    const isOptimalRange = Math.abs(candidate.distance - optimalRange) <= optimalTolerance;

    if (isOptimalRange) {
      // Prioritize lowest HP at optimal range
      const hp = getHealthPercentage(candidate.actor);
      if (hp < bestOptimalHp) {
        bestOptimalHp = hp;
        bestOptimal = candidate;
      }
    } else {
      // For non-optimal range, use appropriate scoring
      let score: number;
      if (hasFalloff) {
        // Ranged weapons: HP/distance ratio (lower is better)
        score = getHealthPercentage(candidate.actor) / candidate.distance;
      } else {
        // Melee/reach weapons: distance only (closer is better)
        score = candidate.distance;
      }

      if (score < bestInRangeScore) {
        bestInRangeScore = score;
        bestInRange = candidate;
      }
    }
  }

  // Return best target based on priority
  if (bestOptimal) {
    return { actorId: bestOptimal.actorId, distance: bestOptimal.distance };
  }

  if (bestInRange) {
    return { actorId: bestInRange.actorId, distance: bestInRange.distance };
  }

  // Fallback to closest target for movement
  if (closestOverall) {
    return { actorId: closestOverall.actorId, distance: closestOverall.distance };
  }

  throw new Error('No valid targets found'); // Should never reach here due to earlier validation
}
