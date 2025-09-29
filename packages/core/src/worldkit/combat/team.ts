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
 */
export function areEnemies(
  actorId1: ActorURN,
  actorId2: ActorURN,
  combatants: Map<ActorURN, Combatant>,
): boolean {
  const combatant1 = combatants.get(actorId1);
  if (!combatant1) {
    throw new Error(`Combatant ${actorId1} not found in combatants`);
  }

  const combatant2 = combatants.get(actorId2);
  if (!combatant2) {
    throw new Error(`Combatant ${actorId2} not found in combatants`);
  }

  return combatant1.team !== combatant2.team;
}

/**
 * Pure function to determine if two combatants are allies
 *
 * @param combatant1 First combatant
 * @param combatant2 Second combatant
 * @param options Optional configuration for team comparison logic
 * @returns true if combatants are allies (same team)
 */
export function areAllies(
  actorId1: ActorURN,
  actorId2: ActorURN,
  combatants: Map<ActorURN, Combatant>,
): boolean {
  const combatant1 = combatants.get(actorId1);
  if (!combatant1) {
    throw new Error(`Combatant ${actorId1} not found in combatants`);
  }

  const combatant2 = combatants.get(actorId2);
  if (!combatant2) {
    throw new Error(`Combatant ${actorId2} not found in combatants`);
  }

  return combatant1.team === combatant2.team;
}

/**
 * Filter combatants to find enemies of the given combatant
 * Zero-copy iteration approach for performance
 *
 * @param combatants Map of all combatants
 * @param referenceCombatant The combatant to find enemies for
 * @param options Optional configuration for team comparison logic
 * @returns Array of enemy combatants
 */
export function filterEnemies(
  combatants: Map<ActorURN, Combatant>,
  referenceCombatant: Combatant,
): Combatant[] {
  const enemies: Combatant[] = [];

  for (const [actorId, combatant] of combatants) {
    if (actorId === referenceCombatant.actorId) continue;

    if (areEnemies(referenceCombatant.actorId, actorId, combatants)) {
      enemies.push(combatant);
    }
  }

  return enemies;
}

/**
 * Filter combatants to find allies of the given combatant
 * Zero-copy iteration approach for performance
 *
 * @param combatants Map of all combatants
 * @param referenceCombatant The combatant to find allies for
 * @param options Optional configuration for team comparison logic
 * @returns Array of allied combatants (excluding the reference combatant itself)
 */
export function filterAllies(
  combatants: Map<ActorURN, Combatant>,
  referenceCombatant: Combatant,
): Combatant[] {
  const allies: Combatant[] = [];

  for (const [actorId, combatant] of combatants) {
    if (actorId === referenceCombatant.actorId) continue;

    if (areAllies(referenceCombatant.actorId, actorId, combatants)) {
      allies.push(combatant);
    }
  }

  return allies;
}
