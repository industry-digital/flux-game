import { CombatAction, Combatant, CombatSession } from '~/types/combat';
import { analyzeBattlefield } from '~/worldkit/combat/ai/analysis';
import { createHeuristicProfile } from '~/worldkit/combat/ai/heuristics';
import { findOptimalPlan, DEFAULT_SEARCH_CONFIG } from '~/worldkit/combat/ai/search';
import { SearchConfig } from '~/types/combat-ai';
import { TransformerContext } from '~/types/handler';

const REACH_SEARCH_CONFIG: SearchConfig = {
  ...DEFAULT_SEARCH_CONFIG,
  maxDepth: 3,
  minScoreThreshold: 25,
};


/**
 * A reach combatant wants to gap-close as fast as possible, but stay at *reach distance* (2m) away from
 * enemies, where it has a reach advantage over melee weapons.
 */
export function computeReachCombatPlan(
  context: TransformerContext,
  session: CombatSession,
  combatant: Combatant,
  trace: string,
): CombatAction[] {
  const { world, declareError, schemaManager } = context;
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

  // Analyze battlefield and create tactical situation
  const situation = analyzeBattlefield(context, session, combatant, weaponSchema);

  // Create reach-specific heuristic profile with emphasis on precise positioning
  const profile = createHeuristicProfile(weaponSchema);

  // Use exhaustive search to find optimal plan
  const optimalPlan = findOptimalPlan(context, situation, profile, REACH_SEARCH_CONFIG);

  return optimalPlan?.actions ?? [];
}
