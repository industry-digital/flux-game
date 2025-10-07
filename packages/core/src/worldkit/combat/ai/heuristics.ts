import { WeaponSchema } from '~/types/schema/weapon';
import {
  TacticalSituation,
  PlanNode,
  HeuristicProfile,
  TacticalPriorities,
  HeuristicProfileFactory,
  ScoredPlan
} from '~/types/combat-ai';
import { classifyWeapon, RangeClassification } from '~/worldkit/combat/weapon';
import { assessWeaponCapabilities } from '~/worldkit/combat/ai/analysis';
import { CommandType } from '~/types/intent';
import { TransformerContext } from '~/types/handler';

/**
 * Evaluate damage potential heuristic for a plan node
 */
export function evaluateDamageHeuristic(
  context: TransformerContext,
  node: PlanNode,
  situation: TacticalSituation,
): number {
  let damageScore = 0;

  // Check if plan ends with an attack action
  const lastAction = node.actions[node.actions.length - 1];
  if (lastAction?.type === CommandType.ATTACK || lastAction?.type === CommandType.STRIKE) {
    const { primaryTarget, primaryTargetDistance } = situation.assessments;

    if (primaryTarget && primaryTargetDistance !== null) {
      // For non-ranged weapons (no falloff), enforce strict range requirements
      const isNonRangedWeapon = !situation.weapon.range.falloff;

      if (isNonRangedWeapon) {
        // Calculate final position after all movement actions in the plan
        let finalPosition = situation.combatant.position.coordinate;
        for (const action of node.actions) {
          if (action.type === CommandType.ADVANCE) {
            const moveDistance = (action.args as any)?.distance || 0;
            const direction = (action.args as any)?.direction || 1;
            finalPosition += moveDistance * direction;
          } else if (action.type === CommandType.RETREAT) {
            const moveDistance = (action.args as any)?.distance || 0;
            finalPosition -= moveDistance; // Retreat is always backwards
          }
        }

        // Find target's position
        const targetCombatant = situation.validTargets.find(t => t.actorId === primaryTarget)?.combatant;
        if (targetCombatant) {
          const finalDistanceToTarget = Math.abs(finalPosition - targetCombatant.position.coordinate);
          const optimalRange = situation.weapon.range.optimal || 1;

          // For non-ranged weapons: Zero score if not in optimal range after movement
          if (finalDistanceToTarget > optimalRange) {
            return 0;
          }
        }
      }

      // Calculate distance to target after plan execution for weapon assessment
      let finalPosition = situation.combatant.position.coordinate;
      for (const action of node.actions) {
        if (action.type === CommandType.ADVANCE) {
          const moveDistance = (action.args as any)?.distance || 0;
          const direction = (action.args as any)?.direction || 1;
          finalPosition += moveDistance * direction;
        } else if (action.type === CommandType.RETREAT) {
          const moveDistance = (action.args as any)?.distance || 0;
          finalPosition -= moveDistance;
        }
      }

      const targetCombatant = situation.validTargets.find(t => t.actorId === primaryTarget)?.combatant;
      const finalDistanceToTarget = targetCombatant
        ? Math.abs(finalPosition - targetCombatant.position.coordinate)
        : primaryTargetDistance;

      const weaponAssessment = assessWeaponCapabilities(context, situation.weapon, finalDistanceToTarget);

      // Base damage score from weapon effectiveness at final position
      damageScore += weaponAssessment.effectiveness * 100;

      // Bonus for optimal range
      if (weaponAssessment.isOptimalRange) {
        damageScore += 25;
      }

      // Bonus for multiple attacks in sequence (momentum)
      const attackCount = node.actions.filter(a =>
        a.type === CommandType.ATTACK || a.type === CommandType.STRIKE
      ).length;
      damageScore += Math.min(attackCount - 1, 2) * 15; // Max +30 for follow-up attacks
    }
  }

  return Math.max(0, damageScore);
}

/**
 * Evaluate resource efficiency heuristic for a plan node
 */
export function evaluateResourceEfficiency(
  node: PlanNode,
  initialResources: { ap: number; energy: number },
): number {
  const totalApUsed = initialResources.ap - node.combatantState.ap;
  const totalEnergyUsed = initialResources.energy - node.combatantState.energy;

  // Efficiency = output value / resource cost
  // Higher scores for plans that accomplish more with less resources

  let efficiencyScore = 0;

  // AP efficiency: prefer plans that use AP effectively
  if (totalApUsed > 0) {
    const actionCount = node.actions.length;
    const apPerAction = totalApUsed / actionCount;

    // Optimal AP usage is around 1.5-2.0 per action
    if (apPerAction >= 1.0 && apPerAction <= 2.5) {
      efficiencyScore += 40;
    } else if (apPerAction < 1.0) {
      efficiencyScore += 20; // Cheap actions are okay
    } else {
      efficiencyScore += Math.max(0, 40 - (apPerAction - 2.5) * 10); // Penalty for expensive actions
    }
  }

  // Energy efficiency: prefer plans that don't waste energy
  const energyRatio = totalEnergyUsed / Math.max(1, initialResources.energy);
  if (energyRatio < 0.3) {
    efficiencyScore += 30; // Conservative energy usage
  } else if (energyRatio < 0.6) {
    efficiencyScore += 20; // Moderate energy usage
  } else {
    efficiencyScore += 10; // High energy usage (still valid)
  }

  // Bonus for leaving some resources for future turns
  if (node.combatantState.ap >= 1.0) {
    efficiencyScore += 15;
  }

  return Math.max(0, efficiencyScore);
}

/**
 * Evaluate positioning heuristic for a plan node
 */
export function evaluatePositioning(
  node: PlanNode,
  situation: TacticalSituation,
): number {
  const { weapon, assessments } = situation;
  const weaponClass = classifyWeapon(weapon);

  let positioningScore = 0;

  // Calculate final position after all actions
  const finalPosition = node.combatantState.position;

  if (assessments.primaryTarget && assessments.primaryTargetDistance !== null) {
    const targetCombatant = situation.validTargets.find(t => t.actorId === assessments.primaryTarget)?.combatant;
    if (targetCombatant) {
      const finalDistance = Math.abs(finalPosition - targetCombatant.position.coordinate);
      const optimalDistance = assessments.optimalDistance;

      // Score based on distance to optimal range
      const distanceFromOptimal = Math.abs(finalDistance - optimalDistance);

      switch (weaponClass) {
        case RangeClassification.MELEE:
          // Melee wants to be as close as possible (≤1m)
          if (finalDistance <= 1) {
            positioningScore += 100;
          } else if (finalDistance <= 3) {
            positioningScore += 80 - (finalDistance - 1) * 20;
          } else {
            // Improved scoring for partial progress toward optimal range
            const initialDistance = Math.abs(situation.combatant.position.coordinate - targetCombatant.position.coordinate);
            const progressMade = Math.max(0, initialDistance - finalDistance);
            const progressRatio = progressMade / Math.max(1, initialDistance);

            // Base score for making progress + bonus for significant progress
            positioningScore += Math.max(0, 30 * progressRatio + 10);
          }
          break;

        case RangeClassification.REACH:
          // Reach wants exactly 2m distance
          if (finalDistance === 2) {
            positioningScore += 100;
          } else if (finalDistance === 1 || finalDistance === 3) {
            positioningScore += 60; // One move away from optimal
          } else {
            positioningScore += Math.max(0, 40 - Math.abs(finalDistance - 2) * 10);
          }
          break;

        case RangeClassification.RANGED:
          // Ranged wants optimal distance or slightly beyond
          if (finalDistance <= optimalDistance) {
            positioningScore += 100;
          } else if (weapon.range.falloff) {
            const falloffRanges = (finalDistance - optimalDistance) / weapon.range.falloff;
            positioningScore += Math.max(0, 100 - falloffRanges * 25);
          } else {
            positioningScore += 50; // No falloff, binary effectiveness
          }
          break;
      }

      // Bonus for maintaining safe distance (ranged weapons)
      if (weaponClass === RangeClassification.RANGED && finalDistance >= 5) {
        positioningScore += 20;
      }

      // Penalty for being too close with ranged weapons
      if (weaponClass === RangeClassification.RANGED && finalDistance <= 2) {
        positioningScore -= 30;
      }
    }
  }

  // Bonus for battlefield positioning (avoid edges)
  const battlefieldCenter = 150; // Middle of 300m battlefield
  const distanceFromCenter = Math.abs(finalPosition - battlefieldCenter);
  positioningScore += Math.max(0, 20 - distanceFromCenter / 10);

  return Math.max(0, positioningScore);
}

/**
 * Evaluate tactical momentum heuristic for a plan node
 */
export function evaluateMomentum(
  node: PlanNode,
  situation: TacticalSituation,
): number {
  let momentumScore = 0;

  // Analyze action sequence for tactical flow
  const actions = node.actions;

  // Bonus for logical action sequences
  for (let i = 1; i < actions.length; i++) {
    const prevAction = actions[i - 1];
    const currentAction = actions[i];

    // Good sequences: GO -> ATTACK, DASH -> ATTACK, TARGET -> ATTACK
    if (currentAction.type === CommandType.ATTACK) {
      if (prevAction.type === CommandType.ADVANCE || prevAction.type === CommandType.DASH) {
        momentumScore += 25; // Good positioning before attack
      } else if (prevAction.type === CommandType.TARGET) {
        momentumScore += 15; // Good targeting before attack
      }
    }

    // Remove old bonus for GO -> GO (now handled by efficiency heuristic)

    // Penalty for inefficient sequences: ATTACK -> GO (unless kiting)
    if (currentAction.type === CommandType.ADVANCE && prevAction.type === CommandType.ATTACK) {
      const weaponClass = classifyWeapon(situation.weapon);
      if (weaponClass !== RangeClassification.RANGED) {
        momentumScore -= 15; // Moving after attack is usually inefficient
      }
    }
  }

  // Bonus for decisive plans (end with attack)
  const lastAction = actions[actions.length - 1];
  if (lastAction?.type === CommandType.ATTACK || lastAction?.type === CommandType.STRIKE) {
    momentumScore += 30;
  }

  // Bonus for gap-closing movement with non-ranged weapons
  const isNonRangedWeapon = !situation.weapon.range.falloff;
  if (isNonRangedWeapon && actions.length > 0) {
    const hasMovement = actions.some(a => a.type === CommandType.ADVANCE);
    if (hasMovement) {
      // Calculate if movement makes meaningful progress toward optimal range
      let finalPosition = situation.combatant.position.coordinate;
      for (const action of actions) {
        if (action.type === CommandType.ADVANCE) {
          const moveDistance = (action.args as any)?.distance || 0;
          const direction = (action.args as any)?.direction || 1;
          finalPosition += moveDistance * direction;
        }
      }

      const targetCombatant = situation.validTargets.find(t => t.actorId === situation.assessments.primaryTarget)?.combatant;
      if (targetCombatant) {
        const initialDistance = Math.abs(situation.combatant.position.coordinate - targetCombatant.position.coordinate);
        const finalDistance = Math.abs(finalPosition - targetCombatant.position.coordinate);
        const progressMade = Math.max(0, initialDistance - finalDistance);
        const progressRatio = progressMade / Math.max(1, initialDistance);

        // Significant bonus for meaningful gap-closing progress
        if (progressRatio >= 0.3) { // At least 30% progress
          const gapClosingBonus = Math.min(25, progressRatio * 40);
          momentumScore += gapClosingBonus;
        }
      }
    }
  }

  // Bonus for efficient action count (not too many, not too few)
  const actionCount = actions.length;
  if (actionCount >= 2 && actionCount <= 4) {
    momentumScore += 20;
  } else if (actionCount === 1) {
    momentumScore += 10; // Simple plans can be good
  }

  return Math.max(0, momentumScore);
}

/**
 * Evaluate risk/safety heuristic for a plan node
 */
export function evaluateRisk(
  node: PlanNode,
  situation: TacticalSituation,
): number {
  let riskScore = 100; // Start with full safety score, subtract for risks

  const { weapon, assessments } = situation;
  const weaponClass = classifyWeapon(weapon);
  const finalPosition = node.combatantState.position;

  // Risk from low resources after plan execution
  const finalAp = node.combatantState.ap;
  const finalEnergy = node.combatantState.energy;

  if (finalAp < 1.0) {
    riskScore -= 30; // High risk with no AP left
  } else if (finalAp < 2.0) {
    riskScore -= 15; // Moderate risk with low AP
  }

  if (finalEnergy < situation.resources.energy.max * 0.2) {
    riskScore -= 25; // High risk with very low energy
  } else if (finalEnergy < situation.resources.energy.max * 0.4) {
    riskScore -= 10; // Moderate risk with low energy
  }

  // Risk from positioning
  if (assessments.primaryTarget) {
    const targetCombatant = situation.validTargets.find(t => t.actorId === assessments.primaryTarget)?.combatant;
    if (targetCombatant) {
      const finalDistance = Math.abs(finalPosition - targetCombatant.position.coordinate);

      // Risk for ranged weapons being too close
      if (weaponClass === RangeClassification.RANGED && finalDistance <= 2) {
        riskScore -= 40; // Very risky for ranged combatants
      }

      // Risk for melee weapons being too far
      if (weaponClass === RangeClassification.MELEE && finalDistance > 5) {
        riskScore -= 20; // Moderate risk, hard to close distance
      }
    }
  }

  // Risk from battlefield edges
  if (finalPosition <= 10 || finalPosition >= 290) {
    riskScore -= 15; // Risk from being near battlefield edges
  }

  // Risk from overextension (too many actions)
  if (node.actions.length > 4) {
    riskScore -= 20; // Risk from complex plans
  }

  return Math.max(0, riskScore);
}

/**
 * Create weapon-specific heuristic profile
 */
export function createHeuristicProfile(
  weapon: WeaponSchema,
): HeuristicProfile {
  const weaponClass = classifyWeapon(weapon);

  let priorities: TacticalPriorities;
  let optimalDistance: number;
  let minSafeDistance: number;
  let maxEffectiveDistance: number;
  let controlsSpace: boolean;

  switch (weaponClass) {
    case RangeClassification.MELEE:
      priorities = {
        damageWeight: 0.35,
        efficiencyWeight: 0.15,
        positioningWeight: 0.25,
        momentumWeight: 0.15,
        riskWeight: 0.10,
      };
      optimalDistance = 1;
      minSafeDistance = 0;
      maxEffectiveDistance = 1;
      controlsSpace = false;
      break;

    case RangeClassification.REACH:
      priorities = {
        damageWeight: 0.30,
        efficiencyWeight: 0.15,
        positioningWeight: 0.35,
        momentumWeight: 0.10,
        riskWeight: 0.10,
      };
      optimalDistance = 2;
      minSafeDistance = 1;
      maxEffectiveDistance = 2;
      controlsSpace = true;
      break;

    case RangeClassification.RANGED:
      priorities = {
        damageWeight: 0.25,
        efficiencyWeight: 0.20,
        positioningWeight: 0.20,
        momentumWeight: 0.10,
        riskWeight: 0.25,
      };
      optimalDistance = weapon.range.optimal;
      minSafeDistance = 5;
      maxEffectiveDistance = weapon.range.falloff
        ? weapon.range.optimal + (weapon.range.falloff * 3)
        : weapon.range.optimal;
      controlsSpace = false;
      break;

    default:
      // Fallback to melee profile
      priorities = {
        damageWeight: 0.35,
        efficiencyWeight: 0.15,
        positioningWeight: 0.25,
        momentumWeight: 0.15,
        riskWeight: 0.10,
      };
      optimalDistance = 1;
      minSafeDistance = 0;
      maxEffectiveDistance = 1;
      controlsSpace = false;
  }

  return {
    priorities,
    optimalDistance,
    minSafeDistance,
    maxEffectiveDistance,
    controlsSpace,
  };
}

/**
 * Evaluate a plan node using composite heuristic scoring
 */
export function evaluateNode(
  context: TransformerContext,
  node: PlanNode,
  situation: TacticalSituation,
  profile: HeuristicProfile,
): number {
  const initialResources = {
    ap: situation.resources.ap.current,
    energy: situation.resources.energy.current,
  };

  // Calculate individual heuristic scores
  const damageScore = evaluateDamageHeuristic(context, node, situation);
  const efficiencyScore = evaluateResourceEfficiency(node, initialResources);
  const positioningScore = evaluatePositioning(node, situation);
  const momentumScore = evaluateMomentum(node, situation);
  const riskScore = evaluateRisk(node, situation);

  // Apply weighted composite scoring
  const { priorities } = profile;
  const totalScore =
    (damageScore * priorities.damageWeight) +
    (efficiencyScore * priorities.efficiencyWeight) +
    (positioningScore * priorities.positioningWeight) +
    (momentumScore * priorities.momentumWeight) +
    (riskScore * priorities.riskWeight);


  // Cache the score in the node
  node.score = totalScore;

  return totalScore;
}

/**
 * Create a scored plan from a plan node
 */
export function createScoredPlan(
  context: TransformerContext,
  node: PlanNode,
  situation: TacticalSituation,
  profile: HeuristicProfile,
): ScoredPlan {
  const initialResources = {
    ap: situation.resources.ap.current,
    energy: situation.resources.energy.current,
  };

  // Calculate detailed score breakdown
  const damage = evaluateDamageHeuristic(context, node, situation);
  const efficiency = evaluateResourceEfficiency(node, initialResources);
  const positioning = evaluatePositioning(node, situation);
  const momentum = evaluateMomentum(node, situation);
  const risk = evaluateRisk(node, situation);

  const total = evaluateNode(context, node, situation, profile);

  return {
    actions: [...node.actions], // Copy actions array
    score: total,
    scoreBreakdown: {
      damage,
      efficiency,
      positioning,
      momentum,
      risk,
      total,
    },
  };
}

/**
 * Factory function for creating heuristic profiles
 */
export function createHeuristicProfileFactory(): HeuristicProfileFactory {
  return {
    forWeapon: (weapon: WeaponSchema) => {
      return createHeuristicProfile(weapon);
    },

    custom: (base: HeuristicProfile, overrides: Partial<HeuristicProfile>) => {
      return {
        ...base,
        ...overrides,
        priorities: {
          ...base.priorities,
          ...(overrides.priorities || {}),
        },
      };
    },
  };
}
