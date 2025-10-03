import { CombatSession, Combatant } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { WeaponSchema } from '~/types/schema/weapon';
import { ActorURN } from '~/types/taxonomy';
import {
  TacticalSituation,
  WeaponAssessment,
  PositionAssessment,
  TacticalSituationFactory,
} from '~/types/combat-ai';
import { classifyWeapon, RangeClassification, canWeaponHitFromDistance } from '~/worldkit/combat/weapon';
import { computeDistanceBetweenCombatants } from '~/worldkit/combat/range';
import { getActorEffectiveStatValue, isActorAlive } from '~/worldkit/entity/actor';
import { DEFAULT_ATTACK_AP_COST } from '~/worldkit/combat/ap';
import { apToDistance, distanceToAp } from '~/worldkit/physics/movement';
import { areEnemies } from '~/worldkit/combat/team';
import { targetingApi } from './targeting';
import { DEFAULT_COMBAT_PLANNING_DEPS, CombatPlanningDependencies } from './deps';
import { Stat } from '~/types/entity/actor';

/**
 * Calculate AP cost for a given distance using physics
 * AP cost = actual time needed, rounded up to nearest 0.1s
 */
function calculatePhysicsBasedAPCost(
  powStat: number,
  finStat: number,
  targetDistance: number
): number {
  // Use the same movement system as the actual game physics
  // Assume baseline mass of 70kg for AI calculations
  return distanceToAp(powStat, finStat, targetDistance, 70);
}

// Performance-first constants
const DEFAULT_REPOSITIONING_THRESHOLD = 1.0; // meters

// Target selection now handled by advanced targeting system in ./targeting.ts

// Cache key generators for memoization
const createDistanceCacheKey = (id1: ActorURN, id2: ActorURN): string =>
  id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;

const createTargetCacheKey = (combatantId: ActorURN, weaponId: string): string =>
  `${combatantId}:${weaponId}`;

const createWeaponCacheKey = (weaponId: string, distance: number): string =>
  `${weaponId}:${distance.toFixed(1)}`;

function computeValidTargets(
  context: TransformerContext,
  session: CombatSession,
  combatant: Combatant,
  weapon: WeaponSchema,
): PotentialTarget[] {
  // Check target cache first for performance
  const targetCacheKey = createTargetCacheKey(combatant.actorId, weapon.urn);
  const cachedTargets = context.targetCache.get(targetCacheKey);
  if (cachedTargets) {
    return cachedTargets as PotentialTarget[];
  }

  const out: PotentialTarget[] = [];

  for (const [actorId, targetCombatant] of session.data.combatants) {
    if (actorId === combatant.actorId) continue;

    const targetActor = context.world.actors[actorId];
    if (!targetActor || !isActorAlive(targetActor)) continue;

    // Skip allies - only target enemies
    if (!areEnemies(combatant.actorId, targetCombatant.actorId, session.data.combatants)) {
      continue;
    }

    // Use cached distance if available
    const distanceCacheKey = createDistanceCacheKey(combatant.actorId, actorId);
    let distance = context.distanceCache.get(distanceCacheKey);
    if (distance === undefined) {
      distance = computeDistanceBetweenCombatants(combatant, targetCombatant);
      context.distanceCache.set(distanceCacheKey, distance);
    }

    const isInRange = canWeaponHitFromDistance(weapon, distance);
    const isOptimalRange = distance <= weapon.range.optimal;

    out.push({
      actorId,
      combatant: targetCombatant,
      distance,
      isInRange,
      isOptimalRange,
      // Add tactical scoring data for enhanced target selection
      healthRatio: targetActor.hp.eff.cur / targetActor.hp.eff.max,
      tacticalScore: 0, // Will be computed in selectOptimalTarget
    });
  }

  // Cache the results for future queries
  context.targetCache.set(targetCacheKey, out);
  return out;
}

type PotentialTarget = {
  actorId: ActorURN;
  combatant: Combatant;
  distance: number;
  isInRange: boolean;
  isOptimalRange: boolean;
  healthRatio: number;
  tacticalScore: number;
}

/**
 * Analyze battlefield state and create tactical situation with pre-computed values
 */
export function analyzeBattlefield(
  context: TransformerContext,
  session: CombatSession,
  combatant: Combatant,
  weapon: WeaponSchema,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): TacticalSituation {
  const targetingHook = targetingApi(context, session, deps);
  const { chooseTargetForActor } = targetingHook;
  // Find all valid targets (for backward compatibility with TacticalSituation interface)
  const validTargets = computeValidTargets(context, session, combatant, weapon);

  // Use advanced targeting system for optimal target selection
  let primaryTarget: ActorURN | null = null;
  let primaryTargetDistance: number | null = null;

  const targetResult = chooseTargetForActor(combatant.actorId);
  primaryTarget = targetResult.actorId;
  primaryTargetDistance = targetResult.distance;

  // Assess tactical situation
  const canAttack = primaryTarget !== null &&
    primaryTargetDistance !== null &&
    canWeaponHitFromDistance(weapon, primaryTargetDistance) &&
    combatant.ap.eff.cur >= DEFAULT_ATTACK_AP_COST;

  const optimalDistance = weapon.range.optimal;
  const needsRepositioning = primaryTarget !== null &&
    primaryTargetDistance !== null &&
    shouldRepositionForWeapon(weapon, primaryTargetDistance, optimalDistance);


  return {
    combatant,
    session,
    weapon,
    validTargets,
    resources: {
      ap: {
        current: combatant.ap.eff.cur,
        max: combatant.ap.eff.max,
      },
      energy: {
        current: combatant.energy.eff.cur,
        max: combatant.energy.eff.max,
      },
    },
    assessments: {
      primaryTarget,
      primaryTargetDistance,
      canAttack,
      needsRepositioning,
      optimalDistance,
    },
  };
}

/**
 * Assess weapon capabilities against a specific target at given distance
 */
export function assessWeaponCapabilities(
  context: TransformerContext,
  weapon: WeaponSchema,
  targetDistance: number,
): WeaponAssessment {
  // Use weapon cache if context is provided
  if (context) {
    const weaponCacheKey = createWeaponCacheKey(weapon.urn, targetDistance);
    const cachedAssessment = context.weaponCache.get(weaponCacheKey);
    if (cachedAssessment) {
      return cachedAssessment as WeaponAssessment;
    }
  }
  const weaponClass = classifyWeapon(weapon);
  const canHit = canWeaponHitFromDistance(weapon, targetDistance);
  const optimalDistance = weapon.range.optimal;
  const isOptimalRange = targetDistance <= optimalDistance;

  // Calculate effectiveness based on weapon type and distance
  let effectiveness = 0;
  if (canHit) {
    switch (weaponClass) {
      case RangeClassification.MELEE:
        // Melee: full effectiveness at 1m, drops off quickly
        effectiveness = targetDistance <= 1 ? 1.0 : 0;
        break;

      case RangeClassification.REACH:
        // Reach: full effectiveness only at exactly 2m
        effectiveness = targetDistance === 2 ? 1.0 : 0;
        break;

      case RangeClassification.RANGED:
        // Ranged: full effectiveness within optimal, falloff beyond
        if (targetDistance <= optimalDistance) {
          effectiveness = 1.0;
        } else if (weapon.range.falloff) {
          const falloffRanges = (targetDistance - optimalDistance) / weapon.range.falloff;
          // Beyond 3 falloff ranges, effectiveness drops to 0
          effectiveness = falloffRanges > 3 ? 0 : Math.pow(0.5, falloffRanges);
        } else {
          effectiveness = 0;
        }
        break;
    }
  }

  // Determine distance category for tactical decisions
  let distanceCategory: 'melee' | 'close' | 'medium' | 'long';
  if (targetDistance <= 1) {
    distanceCategory = 'melee';
  } else if (targetDistance <= 5) {
    distanceCategory = 'close';
  } else if (targetDistance <= 15) {
    distanceCategory = 'medium';
  } else {
    distanceCategory = 'long';
  }

  const assessment = {
    canHit,
    effectiveness,
    optimalDistance,
    isOptimalRange,
    distanceCategory,
  };

  // Cache the result if context is provided
  if (context) {
    const weaponCacheKey = createWeaponCacheKey(weapon.urn, targetDistance);
    context.weaponCache.set(weaponCacheKey, assessment);
  }

  return assessment;
}

/**
 * Evaluate positioning options and advantages
 */
export function evaluatePositioning(
  context: TransformerContext,
  session: CombatSession,
  combatant: Combatant,
  targetId: ActorURN | null,
): PositionAssessment {
  const { combatants, battlefield } = session.data;

  if (!targetId) {
    return {
      currentAdvantage: 0,
      potentialPositions: [],
      shouldReposition: false,
      bestPosition: null,
    };
  }

  const target = combatants.get(targetId);
  if (!target) {
    return {
      currentAdvantage: 0,
      potentialPositions: [],
      shouldReposition: false,
      bestPosition: null,
    };
  }

  const currentDistance = computeDistanceBetweenCombatants(combatant, target);
  const currentAdvantage = calculatePositionAdvantage(
    combatant.position.coordinate,
    target.position.coordinate,
    currentDistance
  );

  // Evaluate potential positions within movement range using physics
  const actor = context.world.actors[combatant.actorId];
  if (!actor) {
    return {
      currentAdvantage: 0,
      potentialPositions: [],
      shouldReposition: false,
      bestPosition: null,
    };
  }

  // Calculate physics-based movement capability
  const availableAP = combatant.ap.eff.cur; // AP as time budget

  const power = getActorEffectiveStatValue(actor, Stat.POW);
  const finesse = getActorEffectiveStatValue(actor, Stat.FIN);

  const maxMovement = apToDistance(
    power,
    finesse,
    availableAP,
    70 // baseline mass
  );
  const potentialPositions: Array<{
    coordinate: number;
    advantage: number;
    movementCost: number;
  }> = [];

  // Evaluate positions within physics-based movement range
  const maxCoordinateOffset = Math.floor(maxMovement);
  for (let offset = -maxCoordinateOffset; offset <= maxCoordinateOffset; offset++) {
    if (offset === 0) continue; // Skip current position

    const newCoordinate = Math.max(0, Math.min(
      battlefield.length - 1,
      combatant.position.coordinate + offset
    ));

    const newDistance = Math.abs(newCoordinate - target.position.coordinate);
    const advantage = calculatePositionAdvantage(newCoordinate, target.position.coordinate, newDistance);

    // Calculate physics-based movement cost for this distance
    const distanceToMove = Math.abs(offset);
    const movementCost = distanceToMove > 0
      ? calculatePhysicsBasedAPCost(power, finesse, distanceToMove)
      : 0;

    potentialPositions.push({
      coordinate: newCoordinate,
      advantage,
      movementCost,
    });
  }

  // Sort by advantage score
  potentialPositions.sort((a, b) => b.advantage - a.advantage);

  const bestPosition = potentialPositions.length > 0 ? potentialPositions[0] : null;
  const shouldReposition = bestPosition !== null &&
    bestPosition.advantage > currentAdvantage + 10; // Threshold for repositioning

  return {
    currentAdvantage,
    potentialPositions,
    shouldReposition,
    bestPosition: shouldReposition ? bestPosition.coordinate : null,
  };
}

// Removed selectOptimalTarget function - now using advanced targeting system from ./targeting.ts

/**
 * Weapon-specific repositioning logic for performance and accuracy
 */
function shouldRepositionForWeapon(
  weapon: WeaponSchema,
  currentDistance: number,
  optimalDistance: number,
): boolean {
  const weaponClass = classifyWeapon(weapon);

  switch (weaponClass) {
    case RangeClassification.MELEE:
      // Melee: reposition if not at exactly 1m
      return Math.abs(currentDistance - 1) > 0.1;

    case RangeClassification.REACH:
      // Reach: reposition if not at exactly 2m
      return Math.abs(currentDistance - 2) > 0.1;

    case RangeClassification.RANGED:
      // Ranged: reposition if significantly outside optimal range
      const threshold = weapon.range.falloff ?
        Math.min(DEFAULT_REPOSITIONING_THRESHOLD, weapon.range.falloff * 0.5) :
        DEFAULT_REPOSITIONING_THRESHOLD;
      return Math.abs(currentDistance - optimalDistance) > threshold;

    default:
      return Math.abs(currentDistance - optimalDistance) > DEFAULT_REPOSITIONING_THRESHOLD;
  }
}

/**
 * Calculate distance category for tactical decisions
 */
export function calculateDistanceCategory(distance: number): 'melee' | 'close' | 'medium' | 'long' {
  if (distance <= 1) return 'melee';
  if (distance <= 5) return 'close';
  if (distance <= 15) return 'medium';
  return 'long';
}

/**
 * Calculate positional advantage score based on distance and tactical factors
 */
function calculatePositionAdvantage(
  position: number,
  targetPosition: number,
  distance: number,
): number {
  let advantage = 0;

  // Base advantage from distance control
  if (distance >= 2 && distance <= 10) {
    advantage += 20; // Good engagement distance
  } else if (distance > 10) {
    advantage += 10; // Safe distance
  }

  // Advantage from battlefield position (center is generally better)
  const centerPosition = 150; // Middle of 300m battlefield
  const distanceFromCenter = Math.abs(position - centerPosition);
  advantage += Math.max(0, 20 - distanceFromCenter / 5);

  // Advantage from relative positioning
  if (position > targetPosition) {
    advantage += 5; // Slight advantage from higher ground (arbitrary)
  }

  return advantage;
}

/**
 * Factory function for creating tactical situations
 */
export function createTacticalSituationFactory(context: TransformerContext): TacticalSituationFactory {
  return {
    create: (session: CombatSession, combatant: Combatant, weapon: WeaponSchema) => {
      return analyzeBattlefield(context, session, combatant, weapon);
    },

    update: (situation: TacticalSituation, changes: Partial<Pick<TacticalSituation, 'combatant' | 'session'>>) => {
      const updatedCombatant = changes.combatant || situation.combatant;
      const updatedSession = changes.session || situation.session;

      return analyzeBattlefield(context, updatedSession, updatedCombatant, situation.weapon);
    },
  };
}
