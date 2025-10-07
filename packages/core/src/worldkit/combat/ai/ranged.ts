import { CombatCommand, Combatant, CombatSession } from '~/types/combat';
import { analyzeBattlefield } from '~/worldkit/combat/ai/analysis';
import { createHeuristicProfile } from '~/worldkit/combat/ai/heuristics';
import { findOptimalPlan, DEFAULT_SEARCH_CONFIG } from '~/worldkit/combat/ai/search';
import { SearchConfig } from '~/types/combat-ai';
import { TransformerContext } from '~/types/handler';

const RANGED_SEARCH_CONFIG: SearchConfig = {
  ...DEFAULT_SEARCH_CONFIG,
  maxDepth: 4,
  minScoreThreshold: 30,
  enableEarlyTermination: true,
};

export function computeRangedCombatPlan(
  context: TransformerContext,
  session: CombatSession,
  combatant: Combatant,
  trace: string,
): CombatCommand[] {
  const { world, declareError } = context;
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

  // Create ranged-specific heuristic profile with emphasis on positioning and safety
  const profile = createHeuristicProfile(weaponSchema);

  // Use exhaustive search to find optimal plan
  const optimalPlan = findOptimalPlan(context, situation, profile, trace, RANGED_SEARCH_CONFIG);

  return optimalPlan?.actions ?? [];
}
