import { Combatant } from '~/types/combat';
import { ActorURN } from '~/types/taxonomy';
import { PotentiallyImpureOperations } from '~/types/handler';

/**
 * Team Filtering System
 *
 * Provides pure functional interface for team-based combat filtering.
 * Follows established patterns with injected impurities for extensibility.
 */

export type TeamFilteringOptions = Partial<PotentiallyImpureOperations> & {
  /**
   * Custom team comparison logic
   * Default: strict equality check
   */
  areAllies?: (team1: string | undefined, team2: string | undefined) => boolean;
};

/**
 * Default team comparison: combatants are allies if they have the same non-empty team
 */
const defaultAreAllies = (team1: string | undefined, team2: string | undefined): boolean => {
  return !!(team1 && team2 && team1 === team2);
};

export const DEFAULT_TEAM_FILTERING_OPTIONS: TeamFilteringOptions = {
  areAllies: defaultAreAllies,
};

/**
 * Pure function to determine if two combatants are enemies
 * Zero-copy approach using direct map lookup
 *
 * @param actorId1 First actor ID
 * @param actorId2 Second actor ID
 * @param combatants Map of all combatants for direct lookup
 * @param options Optional configuration for team comparison logic
 * @returns true if actors are enemies (different teams or no teams)
 * @deprecated Use computeAlliesAndEnemies instead
 */
export const areEnemies = (
  actorId1: ActorURN,
  actorId2: ActorURN,
  combatants: Map<ActorURN, Combatant>,
): boolean => {
  const combatant1 = combatants.get(actorId1);
  if (!combatant1) {
    throw new Error(`Combatant ${actorId1} not found in combatants`);
  }

  const combatant2 = combatants.get(actorId2);
  if (!combatant2) {
    throw new Error(`Combatant ${actorId2} not found in combatants`);
  }

  return combatant1.team !== combatant2.team;
};

export type AlliesAndEnemies = {
  allies: ActorURN[];
  enemies: ActorURN[];
};

export const computeAlliesAndEnemies = (
  as: ActorURN,
  combatants: Map<ActorURN, Combatant>,
  output: AlliesAndEnemies = { allies: [], enemies: [] },
): AlliesAndEnemies => {
  // Clear output arrays if reusing (optimization for repeated calls)
  output.allies.length = 0;
  output.enemies.length = 0;

  // Early termination for single combatant
  if (combatants.size <= 1) {
    return output;
  }

  // Cache reference combatant to avoid repeated lookups
  const referenceCombatant = combatants.get(as);
  if (!referenceCombatant) {
    throw new Error(`Reference combatant ${as} not found in combatants`);
  }

  for (const [actorId, combatant] of combatants) {
    if (actorId === as) {
      continue;
    }
    if (referenceCombatant.team !== combatant.team) {
      output.enemies.push(actorId);
    } else {
      output.allies.push(actorId);
    }
  }

  return output;
};
