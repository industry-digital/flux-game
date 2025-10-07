import { Combatant, CombatCommand, CombatSession } from '~/types/combat';

/**
 * Helper to create positioning actions for cover and concealment
 */
export function createCoverSeekingActions(
  combatant: Combatant,
  session: CombatSession,
  trace: string,
): CombatCommand[] {
  // TODO: Implement cover-seeking behavior
  // - Identify available cover positions
  // - Move to cover when under fire
  // - Use cover to break line of sight
  return [];
}
