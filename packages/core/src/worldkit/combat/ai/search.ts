import { CombatAction } from '~/types/combat';
import { CommandType } from '~/types/intent';
import {
  TacticalSituation,
  PlanNode,
  ScoredPlan,
  SearchConfig,
  SearchEngine,
  SearchMetrics,
  HeuristicProfile,
  TacticalPriorities,
} from '~/types/combat-ai';
import { evaluateNode, createScoredPlan } from '~/worldkit/combat/ai/heuristics';
import { apToDistance, distanceToAp } from '~/worldkit/physics/movement';
import { extractApCost } from '~/worldkit/combat/ap';
import { roundApCostUp, calculateTacticalApCost, calculateTacticalDistance, roundDistanceDown } from '~/worldkit/combat/tactical-rounding';
import { calculateWeaponApCost } from '~/worldkit/combat/damage';
import { TransformerContext } from '~/types/handler';
import { CHANCE_ACTIONS, PLAN_ENDING_ACTIONS } from '~/worldkit/combat/action/constants';
import { assessWeaponCapabilities } from '~/worldkit/combat/ai/analysis';
import { targetingApi } from '~/worldkit/combat/ai/targeting';
import { TARGET_COST } from '~/worldkit/combat/action/target';
import { CombatPlanningDependencies, DEFAULT_COMBAT_PLANNING_DEPS } from './deps';

/**
 * Zero-allocation action sequence builder
 * Avoids array spreading by building sequences incrementally
 */
class ActionSequenceBuilder {
  private actions: CombatAction[] = [];

  constructor(baseActions?: CombatAction[]) {
    if (baseActions && baseActions.length > 0) {
      // Pre-allocate with some extra capacity to avoid frequent resizing
      this.actions = new Array(baseActions.length + 4);
      for (let i = 0; i < baseActions.length; i++) {
        this.actions[i] = baseActions[i];
      }
      this.actions.length = baseActions.length;
    }
  }

  add(action: CombatAction): this {
    this.actions.push(action);
    return this;
  }

  build(): CombatAction[] {
    // Return a copy to maintain immutability
    return this.actions.slice();
  }

  reset(): this {
    this.actions.length = 0;
    return this;
  }
}

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: Readonly<SearchConfig> = {
  maxDepth: 8, // Increased for natural planning depth
  maxNodes: 400, // Increased to handle longer natural plans
  maxTerminalPlans: 100,
  enableEarlyTermination: true,
  minScoreThreshold: 10,
  // Keep DEFEND as plan-ending (defensive stance ends turn)
  // Remove artificial STRIKE constraint (chance actions don't force termination)
  planEndingActions: PLAN_ENDING_ACTIONS,
  chanceActions: CHANCE_ACTIONS,
};

/**
 * Generate and evaluate all valid plans using exhaustive search
 */
export function* generateAndEvaluatePlans(
  context: TransformerContext,
  situation: TacticalSituation,
  profile: HeuristicProfile,
  config: SearchConfig = DEFAULT_SEARCH_CONFIG,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): Generator<ScoredPlan> {
  const rootNode = createInitialNode(situation);
  const visitedNodes = new Set<string>();
  const nodeQueue: PlanNode[] = [rootNode];

  let nodesEvaluated = 0;
  let terminalPlans = 0;

  while (nodeQueue.length > 0 && nodesEvaluated < config.maxNodes && terminalPlans < config.maxTerminalPlans) {
    const currentNode = nodeQueue.shift()!;
    nodesEvaluated++;

    // Skip if we've seen this state before (cycle detection)
    const stateKey = createStateKey(currentNode);
    if (visitedNodes.has(stateKey)) {
      continue;
    }
    visitedNodes.add(stateKey);

    // If this is a terminal node, evaluate and yield the plan
    if (isTerminalNode(currentNode, config)) {
      const scoredPlan = createScoredPlan(context, currentNode, situation, profile);

      // Apply score threshold filter
      if (scoredPlan.score >= config.minScoreThreshold) {
        terminalPlans++;
        yield scoredPlan;
      }
      continue;
    }

    // Natural termination: if we've reached max depth or have no affordable actions,
    // create a plan from current actions (no forced terminal actions needed)

    // Check if we have any affordable actions left
    let hasAffordableActions = false;
    for (const action of getValidActions(context, currentNode, situation, deps)) {
      const apCost = action.cost.ap || 0;
      const energyCost = action.cost.energy || 0;
      if (currentNode.combatantState.ap >= apCost && currentNode.combatantState.energy >= energyCost) {
        hasAffordableActions = true;
        break;
      }
    }

    // If no affordable actions or at max depth, this is a natural terminal state
    if (!hasAffordableActions || currentNode.depth >= config.maxDepth) {
      const scoredPlan = createScoredPlan(context, currentNode, situation, profile);
      if (scoredPlan.score >= config.minScoreThreshold) {
        terminalPlans++;
        yield scoredPlan;
      }
      continue; // This path is complete
    }

    // Generate child nodes for all valid actions
    for (const action of getValidActions(context, currentNode, situation, deps)) {
      const childNode = applyAction(currentNode, action, situation, config);

      // Early termination optimization (with bias for offensive sequences)
      if (config.enableEarlyTermination) {
        const preliminaryScore = evaluateNode(context, childNode, situation, profile);

        // Give offensive actions (STRIKE) more leeway in early termination
        // This encourages exploration of multi-strike sequences
        const isOffensiveAction = action.command === CommandType.STRIKE;
        const effectiveThreshold = isOffensiveAction
          ? config.minScoreThreshold * 0.7  // 30% lower threshold for offensive actions
          : config.minScoreThreshold;

        if (preliminaryScore < effectiveThreshold) {
          continue; // Prune low-scoring branches
        }
      }

      nodeQueue.push(childNode);
    }
  }

}

/**
 * Find the single optimal plan using exhaustive search with memoization
 */
export function findOptimalPlan(
  context: TransformerContext,
  situation: TacticalSituation,
  profile: HeuristicProfile,
  config: SearchConfig = DEFAULT_SEARCH_CONFIG,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): ScoredPlan | null {
  const { searchCache, timestamp } = context;

  // Create cache key for this tactical situation
  const cacheKey = createTacticalCacheKey(situation, profile, config);
  const now = timestamp();

  // Check cache for existing results (with 5 second TTL)
  const cached = searchCache.get(cacheKey);
  if (cached && (now - cached.ts) < 5000) {
    // Return the best plan from cached results
    return cached.plans.length > 0 ? cached.plans[0] : null;
  }

  // Generate and collect all plans for caching
  const allPlans: ScoredPlan[] = [];
  let bestPlan: ScoredPlan | null = null;
  let bestScore = -1;

  for (const plan of generateAndEvaluatePlans(context, situation, profile, config, deps)) {
    allPlans.push(plan);
    if (plan.score > bestScore) {
      bestScore = plan.score;
      bestPlan = plan;
    }
  }

  // Cache the results (sorted by score, best first)
  allPlans.sort((a, b) => b.score - a.score);
  searchCache.set(cacheKey, { plans: allPlans, ts: now });

  // Clean up old cache entries (simple cleanup strategy)
  if (searchCache.size > 100) {
    const cutoff = now - 10000; // Remove entries older than 10 seconds
    let cleanedCount = 0;
    for (const [key, entry] of searchCache) {
      if (entry.ts < cutoff) {
        searchCache.delete(key);
        cleanedCount++;
      }
    }
  }

  // Enforce plan termination invariant: every plan must end with a plan-ending action
  if (bestPlan) {
    bestPlan = ensurePlanTermination(bestPlan, situation, config);
  }

  return bestPlan;
}

/**
 * Ensure plan ends with a plan-ending action (DEFEND or STRIKE)
 *
 * This enforces the invariant that every combat plan must conclude with a plan-ending action.
 * If the plan doesn't end with one, we append a DEFEND action with 0 AP cost.
 */
function ensurePlanTermination(
  plan: ScoredPlan,
  situation: TacticalSituation,
  config: SearchConfig,
): ScoredPlan {
  if (plan.actions.length === 0) {
    // Empty plan - add a DEFEND action
    const defendAction: CombatAction = {
      actorId: situation.combatant.actorId,
      command: CommandType.DEFEND,
      args: { autoDone: true },
      cost: { ap: 0, energy: 0 }, // 0 AP cost - defensive stance only
    };

    return {
      ...plan,
      actions: [defendAction],
    };
  }

  const lastAction = plan.actions[plan.actions.length - 1];
  const endsWithPlanEndingAction = lastAction.command in config.planEndingActions;

  if (!endsWithPlanEndingAction) {
    // Plan doesn't end with plan-ending action - append DEFEND with 0 AP cost
    const defendAction: CombatAction = {
      actorId: situation.combatant.actorId,
      command: CommandType.DEFEND,
      args: { autoDone: true },
      cost: { ap: 0, energy: 0 }, // 0 AP cost - just concludes the plan
    };

    return {
      ...plan,
      actions: [...plan.actions, defendAction],
    };
  }

  // Plan already ends with plan-ending action
  return plan;
}

/**
 * Create initial search node from tactical situation
 */
export function createInitialNode(situation: TacticalSituation): PlanNode {
  const { combatant } = situation;

  return {
    id: 'root',
    parent: null,
    depth: 0,
    actions: [],
    combatantState: {
      ap: combatant.ap.eff.cur,
      energy: combatant.energy.eff.cur,
      position: combatant.position.coordinate,
      facing: combatant.position.facing,
    },
    isTerminal: false,
  };
}

/**
 * Apply action to node and return new node (pure function with structural sharing)
 */
export function applyAction(
  node: PlanNode,
  action: CombatAction,
  situation: TacticalSituation,
  config: SearchConfig = DEFAULT_SEARCH_CONFIG,
): PlanNode {
  // Calculate new combatant state after applying action cost
  const newAp = node.combatantState.ap - (action.cost.ap || 0);
  const newEnergy = node.combatantState.energy - (action.cost.energy || 0);

  // Calculate state changes for different action types
  let newPosition = node.combatantState.position;
  let newFacing = node.combatantState.facing;

  // Track target assignment internally for planning purposes (not exposed in public interface)
  let currentTarget = (node.combatantState as any).target || null;

  if (action.command === CommandType.ADVANCE) {
    // Extract movement from action args (simplified)
    const moveDistance = (action.args as any)?.distance || 1;
    const direction = (action.args as any)?.direction || 1;
    newPosition = Math.max(0, Math.min(299, newPosition + (moveDistance * direction)));
    newFacing = direction;
  } else if (action.command === CommandType.RETREAT) {
    // Extract retreat movement from action args
    const moveDistance = (action.args as any)?.distance || 1;
    const direction = -1; // Retreat is always backwards
    newPosition = Math.max(0, Math.min(299, newPosition + (moveDistance * direction)));
    newFacing = direction;
  } else if (action.command === CommandType.TARGET) {
    // Update target assignment for planning purposes
    currentTarget = (action.args as any)?.target || null;
  }

  // Create new node with structural sharing
  // Use action sequence builder to avoid array spreading
  const actionBuilder = new ActionSequenceBuilder(node.actions);
  actionBuilder.add(action);

  const newNode: PlanNode = {
    id: `${node.id}-${action.command}-${node.actions.length}`,
    parent: node,
    depth: node.depth + 1,
    actions: actionBuilder.build(),
    combatantState: {
      ap: newAp,
      energy: newEnergy,
      position: newPosition,
      facing: newFacing,
      target: currentTarget, // Track target assignment for planning
    } as any,
    isTerminal: isTerminalAction(action, config),
  };

  return newNode;
}

/**
 * Generate valid actions for current node state
 */
export function* getValidActions(
  context: TransformerContext,
  node: PlanNode,
  situation: TacticalSituation,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): Generator<CombatAction> {
  const {
    calculateWeaponApCost: calculateWeaponApCostImpl = calculateWeaponApCost,
  } = deps;
  const { combatant } = situation;
  const currentState = node.combatantState;

  // CRITICAL FIX: Recalculate assessments based on current node position
  // The original situation.assessments are based on initial position, but we need
  // to re-evaluate targeting from the current node's position after any MOVE actions
  let assessments = situation.assessments;

  // If position has changed from initial, re-run full targeting analysis
  if (currentState.position !== combatant.position.coordinate) {
    // Create updated combatant with new position for targeting analysis
    const updatedCombatant = {
      ...combatant,
      position: {
        ...combatant.position,
        coordinate: currentState.position,
      },
    };

    // Create updated session with the new combatant position
    const updatedSession = {
      ...situation.session,
      data: {
        ...situation.session.data,
        combatants: new Map(situation.session.data.combatants),
      },
    };
    updatedSession.data.combatants.set(combatant.actorId, updatedCombatant);

    // Re-run targeting analysis from new position using our battle-tested targeting system
    const { chooseTargetForActor } = targetingApi(context, updatedSession, deps);

    try {
      const newTargetResult = chooseTargetForActor(combatant.actorId);

      // Update assessments with new targeting results
      const newDistance = newTargetResult.distance;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(context.world.actors[combatant.actorId]);
      const newWeaponAssessment = weaponSchema ? assessWeaponCapabilities(context, weaponSchema, newDistance) : null;

      assessments = {
        ...situation.assessments,
        primaryTarget: newTargetResult.actorId,
        primaryTargetDistance: newDistance,
        canAttack: newWeaponAssessment?.canHit || false,
      };
    } catch (error) {
      // If targeting fails (e.g., no valid targets), keep original assessments
      // This can happen if all targets are out of range or eliminated
      console.warn(`Targeting re-evaluation failed from position ${currentState.position}:`, error);
    }
  }

  const { computeActorMass } = context.mass;

  // Calculate actor's actual mass (body + equipment + inventory) in kg
  const actor = context.world.actors[combatant.actorId];
  if (!actor) {
    throw new Error(`Actor ${combatant.actorId} not found`);
  }

  const actorMassGrams = computeActorMass(actor);
  const actorMassKg = actorMassGrams / 1000;

  // Simple resource checking against current state
  const hasAP = (cost: number) => currentState.ap >= cost;
  const hasEnergy = (cost: number) => currentState.energy >= cost;
  const canAfford = (apCost: number, energyCost: number) => hasAP(apCost) && hasEnergy(energyCost);

  const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(actor);
  if (!weaponSchema) {
    throw new Error(`Could not compute equipped weapon schema`);
  }

  // MANDATORY TARGET action (if we have a primary target but no current target assigned)
  // Rule: Whenever there is an AI target selection decision, if the actor doesn't already have a target, we assign it.
  // Check both the original combatant target and any target assigned in the current plan
  const currentTarget = (currentState as any).target || combatant.target;
  if (assessments.primaryTarget && !currentTarget) {
    yield {
      actorId: combatant.actorId,
      command: CommandType.TARGET,
      args: { target: assessments.primaryTarget },
      cost: TARGET_COST,
    };
  }

  // Check if last action was movement to avoid consecutive movement (inefficient due to acceleration/deceleration)
  const lastAction = node.actions[node.actions.length - 1];
  const lastWasMove = lastAction?.command === CommandType.ADVANCE || lastAction?.command === CommandType.RETREAT;

  // ATTACK action (if target available and in range)
  // Consider both original target and any target assigned in the current plan
  const hasTarget = currentTarget || assessments.primaryTarget;
  if (hasTarget && assessments.canAttack) {
    // Calculate actual attack cost based on weapon and actor stats with tactical rounding
    // Convert weapon mass from grams to kilograms (weaponSchema.baseMass is in grams)
    const preciseAttackApCost = calculateWeaponApCostImpl(weaponSchema.baseMass / 1000, actor.stats.fin.eff);
    const tacticalAttackApCost = roundApCostUp(preciseAttackApCost);
    const attackCost = { ap: tacticalAttackApCost, energy: 0 };

    if (canAfford(attackCost.ap, attackCost.energy)) {
      yield {
        actorId: combatant.actorId,
        command: CommandType.STRIKE,
        args: { target: hasTarget },
        cost: attackCost,
      };
    }
  }

  // MOVEMENT actions (only if last action wasn't MOVE to avoid inefficient consecutive movement)
  if (actor && !lastWasMove) {
    // Move toward target
    if (assessments.primaryTarget) {
      const targetCombatant = situation.validTargets.find(t => t.actorId === assessments.primaryTarget)?.combatant;
      if (targetCombatant) {
        const targetPosition = targetCombatant.position.coordinate;
        const currentPosition = currentState.position;

        if (targetPosition !== currentPosition) {
          const direction = targetPosition > currentPosition ? 1 : -1;
          const distanceToTarget = Math.abs(targetPosition - currentPosition);

          // Calculate desired vs affordable movement
          // For melee weapons, we want to get within optimal range, not to exact target position
          const weaponOptimalRange = weaponSchema.range?.optimal || 1;
          const desiredDistance = Math.max(0, distanceToTarget - weaponOptimalRange);  // Where we want to go
          const availableAP = combatant.ap.eff.cur;


          // Binary search to find maximum distance we can afford this turn
          // Apply tactical rounding: round distances down, AP costs up
          let affordableDistance = 0;
          let low = 0, high = desiredDistance;

          while (high - low > 0.1) {
            const mid = (low + high) / 2;
            const preciseApCost = distanceToAp(
              actor.stats.pow.eff,
              actor.stats.fin.eff,
              mid,
              actorMassKg
            );
            const tacticalApCost = roundApCostUp(preciseApCost);

            if (tacticalApCost <= availableAP) {
              low = mid;
              affordableDistance = roundDistanceDown(mid);
            } else {
              high = mid;
            }
          }


          // Optimize for full AP usage: find distance that uses ALL available AP
          // Use apToDistance to find the maximum distance we can travel with available AP
          const maxDistanceWithFullAP = roundDistanceDown(apToDistance(
            actor.stats.pow.eff,
            actor.stats.fin.eff,
            availableAP,
            actorMassKg
          ));


          // If using full AP gets us closer to the target, prefer it over partial AP usage
          if (maxDistanceWithFullAP > affordableDistance && maxDistanceWithFullAP <= desiredDistance * 1.2) {
            affordableDistance = maxDistanceWithFullAP;
          }

          // AI Planning works with tactical values (normalized/rounded) to ensure affordability
          // Calculate maximum tactically affordable distance using tactical rounding from the start
          const maxTacticalDistance = calculateTacticalDistance(
            actor.stats.pow.eff,
            actor.stats.fin.eff,
            currentState.ap, // Use available AP directly
            actorMassKg,
            apToDistance
          );


          if (desiredDistance > maxTacticalDistance && maxTacticalDistance >= 1) {
            // Calculate tactical AP cost for the tactical distance
            const tacticalApCost = calculateTacticalApCost(
              actor.stats.pow.eff,
              actor.stats.fin.eff,
              maxTacticalDistance,
              actorMassKg,
              distanceToAp
            );

            const moveCost = { ap: tacticalApCost, energy: 0 };

            yield {
              actorId: combatant.actorId,
              command: CommandType.ADVANCE,
              args: { type: 'distance', distance: maxTacticalDistance, direction },
              cost: moveCost,
            };
          }
          // If we can reach target this turn, move exactly to target
          else if (desiredDistance <= maxTacticalDistance && desiredDistance >= 1) {
            // Use tactical rounding for desired distance
            const tacticalDesiredDistance = Math.max(1, Math.ceil(desiredDistance));
            const tacticalApCost = calculateTacticalApCost(
              actor.stats.pow.eff,
              actor.stats.fin.eff,
              tacticalDesiredDistance,
              actorMassKg,
              distanceToAp
            );

            // Only generate movement if we can afford the tactical cost
            if (tacticalApCost <= currentState.ap) {
              const moveCost = { ap: tacticalApCost, energy: 0 };

              yield {
                actorId: combatant.actorId,
                command: CommandType.ADVANCE,
                args: { type: 'distance', distance: tacticalDesiredDistance, direction },
                cost: moveCost,
              };
            }
          }
        }
      }
    }

    // Move away from target (kiting for ranged weapons)
    if (assessments.primaryTarget && situation.weapon.range.falloff) {
      // Generate single optimal kiting movement
      const availableAP = combatant.ap.eff.cur;
      const preferredKitingDistance = 8; // Tactical kiting distance

      // Find maximum affordable kiting distance using tactical rounding
      let maxKitingDistance = 0;
      let low = 0, high = preferredKitingDistance;

      while (high - low > 0.1) {
        const mid = (low + high) / 2;
        const preciseApCost = distanceToAp(
          actor.stats.pow.eff,
          actor.stats.fin.eff,
          mid,
          actorMassKg
        );
        const tacticalApCost = roundApCostUp(preciseApCost);

        if (tacticalApCost <= availableAP) {
          low = mid;
          maxKitingDistance = mid;
        } else {
          high = mid;
        }
      }

      if (maxKitingDistance > 0) {
        const preciseApCost = distanceToAp(
          actor.stats.pow.eff,
          actor.stats.fin.eff,
          maxKitingDistance,
          actorMassKg
        );
        const tacticalApCost = roundApCostUp(preciseApCost);
        const tacticalDistance = roundDistanceDown(maxKitingDistance);

        const kitingCost = { ap: tacticalApCost, energy: 0 };

        if (canAfford(kitingCost.ap, kitingCost.energy)) {
          yield {
            actorId: combatant.actorId,
            command: CommandType.RETREAT,
            args: { type: 'distance', distance: tacticalDistance },
            cost: kitingCost,
          };
        }
      }
    }
  }

  // DEFEND action (conditional fallback - only when no other meaningful actions are affordable)
  // Check if we can afford another STRIKE action
  const canAffordAnotherStrike = hasTarget && assessments.canAttack && (() => {
    // Convert weapon mass from grams to kilograms (weaponSchema.baseMass is in grams)
    const preciseAttackApCost = calculateWeaponApCostImpl(weaponSchema.baseMass / 1000, actor.stats.fin.eff);
    const tacticalAttackApCost = roundApCostUp(preciseAttackApCost);
    return currentState.ap >= tacticalAttackApCost;
  })();

  // Check if we can afford any meaningful movement AND if movement would be beneficial
  const hasMovementOpportunity = (() => {
    if (currentState.ap < 1.0 || lastWasMove) return false;

    // If we have a target, check if we need to move to get closer or maintain distance
    if (assessments.primaryTarget) {
      const targetCombatant = situation.validTargets.find(t => t.actorId === assessments.primaryTarget)?.combatant;
      if (targetCombatant) {
        const currentDistance = Math.abs(currentState.position - targetCombatant.position.coordinate);
        const weaponOptimalRange = weaponSchema.range?.optimal || 1;

        // Movement is beneficial if we're not at optimal range
        const isAtOptimalRange = currentDistance <= weaponOptimalRange;
        return !isAtOptimalRange;
      }
    }

    // If no target or can't determine range, assume movement might be beneficial
    return true;
  })();

  const canAffordMeaningfulMovement = hasMovementOpportunity;

  // Generate DEFEND when no other meaningful actions are available:
  // 1. Cannot afford another STRIKE, AND
  // 2. Cannot afford meaningful movement (or just moved), AND
  // 3. Have some AP remaining (otherwise natural termination handles it)
  const hasNoMeaningfulActions = !canAffordAnotherStrike && !canAffordMeaningfulMovement;
  const hasRemainingAP = currentState.ap > 0.1; // Small threshold for rounding tolerance

  if (hasNoMeaningfulActions && hasRemainingAP) {
    const tacticalApCost = roundApCostUp(currentState.ap);
    yield {
      actorId: combatant.actorId,
      command: CommandType.DEFEND,
      args: { autoDone: true },
      cost: { ap: tacticalApCost, energy: 0 }, // Spends all remaining AP (tactically rounded)
    };
  }
}

/**
 * Check if node represents a terminal state (ends with chance action or DEFEND)
 */
export function isTerminalNode(node: PlanNode, config: SearchConfig): boolean {
  if (node.actions.length === 0) return false;

  const lastAction = node.actions[node.actions.length - 1];

  // Check if it's a standard terminal action
  if (isTerminalAction(lastAction, config)) {
    return true;
  }

  // Check if it's a resource-exhausting action (making it effectively terminal)
  const remainingAP = node.combatantState.ap;
  return isResourceExhaustingAction(lastAction, remainingAP + extractApCost(lastAction.cost));
}

/**
 * Check if action terminates a combat plan using config
 */
function isTerminalAction(action: CombatAction, config: SearchConfig): boolean {
  return action.command in config.planEndingActions;
}


/**
 * Check if action would be terminal due to resource exhaustion
 * Any action that exhausts all available AP is turn-ending and should terminate the plan
 */
function isResourceExhaustingAction(action: CombatAction, availableAP: number): boolean {
  const apCost = extractApCost(action.cost);
  // Any action that uses all (or more than) available AP is terminal
  return apCost >= availableAP - 0.05; // Small tolerance for floating point precision
}

/**
 * Create unique state key for cycle detection
 */
function createStateKey(node: PlanNode): string {
  const state = node.combatantState;
  return `${state.position}-${state.ap.toFixed(1)}-${state.energy.toFixed(0)}-${node.depth}`;
}

/**
 * Optimize movement sequences by collapsing consecutive MOVE actions into single efficient moves
 * This handles edge cases where consecutive MOVEs somehow get generated despite prevention logic
 */
export function optimizeMovementSequence(actions: CombatAction[]): CombatAction[] {
  const optimized: CombatAction[] = [];
  let i = 0;

  while (i < actions.length) {
    const action = actions[i];

    if (action.command === CommandType.ADVANCE || action.command === CommandType.RETREAT) {
      // Collect consecutive movement actions in same direction
      let totalDistance = (action.args as any)?.distance || 0;
      const direction = action.command === CommandType.RETREAT ? -1 : ((action.args as any)?.direction || 1);
      let j = i + 1;

      while (j < actions.length && (actions[j].command === CommandType.ADVANCE || actions[j].command === CommandType.RETREAT)) {
        const nextMove = actions[j];
        const nextDistance = (nextMove.args as any)?.distance || 0;
        const nextDirection = nextMove.command === CommandType.RETREAT ? -1 : ((nextMove.args as any)?.direction || 1);

        // Only collapse if same direction (don't collapse forward + backward movement)
        if (nextDirection === direction) {
          totalDistance += nextDistance;
          j++;
        } else {
          break;
        }
      }

      // If we collapsed multiple moves, create single optimized movement action
      if (j > i + 1) {
        // TODO: Recalculate AP cost for the combined distance using movement physics
        // For now, use the sum of individual costs as approximation
        let totalApCost = 0;
        for (let k = i; k < j; k++) {
          totalApCost += actions[k].cost.ap || 0;
        }

        // Use the appropriate command type based on direction
        const commandType = direction < 0 ? CommandType.RETREAT : CommandType.ADVANCE;
        const optimizedMove: CombatAction = {
          ...action,
          command: commandType,
          args: { ...action.args, distance: totalDistance },
          cost: { ap: totalApCost, energy: action.cost.energy || 0 },
        };

        optimized.push(optimizedMove);
      } else {
        // Single movement action, keep as-is
        optimized.push(action);
      }

      i = j; // Skip processed actions
    } else {
      // Non-MOVE action, keep as-is
      optimized.push(action);
      i++;
    }
  }

  return optimized;
}

type TacticalCacheKeyOptions = {
  priorityKeys: (keyof TacticalPriorities)[];
  configKeys: (keyof SearchConfig)[];
  stringify: (value: any) => string;
};

const DEFAULT_CACHE_KEY_OPTIONS: TacticalCacheKeyOptions = {
  priorityKeys: ['damageWeight', 'efficiencyWeight', 'positioningWeight', 'momentumWeight', 'riskWeight'],
  configKeys: ['maxDepth', 'maxNodes', 'minScoreThreshold'],
  stringify: (value: any) => (value ?? 'none').toString(),
};

/**
 * Create cache key for tactical situation to enable memoization of expensive plan generation
 */
export function createTacticalCacheKey(
  situation: TacticalSituation,
  profile: HeuristicProfile,
  config: SearchConfig,
  options: TacticalCacheKeyOptions = DEFAULT_CACHE_KEY_OPTIONS,
): string {
  const { priorityKeys, configKeys, stringify } = options;
  const { combatant, assessments, resources } = situation;

  let output = '';

  for (const key of priorityKeys) {
    output += stringify(profile.priorities[key as keyof TacticalPriorities].toFixed(2));
  }

  for (const key of configKeys) {
    output += stringify(config[key as keyof SearchConfig]);
  }

  output += stringify(combatant.actorId);
  output += stringify(combatant.position?.coordinate ?? 0);
  output += stringify(combatant.position?.facing ?? 1);
  output += stringify(resources.ap.current.toFixed(1));
  output += stringify(resources.energy.current.toFixed(0));
  output += stringify(assessments.primaryTarget);
  output += stringify(assessments.canAttack ? '1' : '0');
  output += stringify(assessments.needsRepositioning ? '0' : '1');
  output += stringify(config.maxDepth);
  output += stringify(config.maxNodes);
  output += stringify(config.minScoreThreshold);

  return output;
}

/**
 * Create search engine with configuration
 */
export function createSearchEngine(
  context: TransformerContext,
  config: SearchConfig = DEFAULT_SEARCH_CONFIG,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): SearchEngine {
  return {
    generatePlans: (situation: TacticalSituation, searchConfig: SearchConfig) => {
      const profile = { priorities: { damageWeight: 0.3, efficiencyWeight: 0.2, positioningWeight: 0.2, momentumWeight: 0.15, riskWeight: 0.15 } } as HeuristicProfile;
      return generateAndEvaluatePlans(context, situation, profile, searchConfig, deps);
    },

    findOptimalPlan: (situation: TacticalSituation, searchConfig: SearchConfig) => {
      const profile = { priorities: { damageWeight: 0.3, efficiencyWeight: 0.2, positioningWeight: 0.2, momentumWeight: 0.15, riskWeight: 0.15 } } as HeuristicProfile;
      return findOptimalPlan(context, situation, profile, searchConfig, deps);
    },

    createRootNode: createInitialNode,

    applyAction: (node: PlanNode, action: CombatAction) => {
      // Need situation for proper application - this is a simplified version
      const mockSituation = {} as TacticalSituation;
      return applyAction(node, action, mockSituation);
    },
  };
}

/**
 * Measure search performance metrics
 */
export function measureSearchPerformance(
  context: TransformerContext,
  situation: TacticalSituation,
  profile: HeuristicProfile,
  config: SearchConfig = DEFAULT_SEARCH_CONFIG,
  {
    hrtime = () => performance.now(),
  }: {
    hrtime?: () => number;
  } = {}
): SearchMetrics {
  const startTime = hrtime();
  let nodesEvaluated = 0;
  let terminalPlans = 0;
  let earlyTerminations = 0;

  // Run search and count metrics
  for (const _ of generateAndEvaluatePlans(context, situation, profile, config)) {
    terminalPlans++;
    nodesEvaluated++; // Simplified counting
  }

  const endTime = hrtime();
  const searchTimeMs = endTime - startTime;
  const plansPerSecond = terminalPlans / Math.max(1, searchTimeMs / 1000);

  return {
    nodesEvaluated,
    terminalPlans,
    searchTimeMs,
    plansPerSecond,
    earlyTerminations,
  };
}
