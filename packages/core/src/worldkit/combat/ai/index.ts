import { Combatant, CombatSession, CombatAction } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { analyzeBattlefield } from '~/worldkit/combat/ai/analysis';
import { createHeuristicProfile } from '~/worldkit/combat/ai/heuristics';
import { findOptimalPlan, optimizeMovementSequence, DEFAULT_SEARCH_CONFIG } from '~/worldkit/combat/ai/search';
import { CombatPlanningDependencies, DEFAULT_COMBAT_PLANNING_DEPS } from './deps';

/**
 * Generate optimal combat plan using natural AP planning
 *
 * Uses actual combatant AP and lets plans terminate naturally via resource exhaustion.
 * Prevents consecutive MOVE actions for movement efficiency and optimizes any that occur.
 */
export function generateCombatPlan(
  context: TransformerContext,
  session: CombatSession,
  combatant: Combatant,
  trace: string,
  deps: CombatPlanningDependencies = DEFAULT_COMBAT_PLANNING_DEPS,
): CombatAction[] {
  const {
    analyzeBattlefield: analyzeBattlefieldImpl = analyzeBattlefield,
    optimizeMovementSequence: optimizeMovementSequenceImpl = optimizeMovementSequence,
    createHeuristicProfile: createHeuristicProfileImpl = createHeuristicProfile,
    findOptimalPlan: findOptimalPlanImpl = findOptimalPlan,
  } = deps;

  const { world, declareError, schemaManager} = context;
  const actor = world.actors[combatant.actorId];

  if (!actor) {
    declareError(`Actor ${combatant.actorId} not found`, trace);
    return [];
  }

  const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(actor);
  if (!weaponSchema) {
    declareError(`Actor ${combatant.actorId} has no weapon`, trace);
    return [];
  }

  // Use actual combatant (no mega-combatant needed)
  const situation = analyzeBattlefieldImpl(context, session, combatant, weaponSchema, deps);

  // Early exit if no valid targets
  if (situation.validTargets.length === 0) {
    return []; // No targets available, no plan needed
  }

  // Early exit if insufficient resources for any meaningful action
  if (situation.resources.ap.current < 1.0) {
    return [];
  }

  // Create heuristic profile for this weapon type
  const profile = createHeuristicProfileImpl(weaponSchema);

  // Use natural search with no plan-ending constraints
  const optimalPlan = findOptimalPlanImpl(context, situation, profile, DEFAULT_SEARCH_CONFIG, deps);

  if (!optimalPlan) {
    return [];
  }

  // Optimize movement sequences (fallback safety for any consecutive MOVEs)
  const optimizedActions = optimizeMovementSequenceImpl(optimalPlan.actions);

  return optimizedActions;
}
