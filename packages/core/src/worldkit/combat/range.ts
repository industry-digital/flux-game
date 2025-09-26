import { Combatant } from '~/types/combat';

/**
 * Given two actors, return the distance between them in meters.
 * It is assumed that both actors are on the same battlefield.
 */
export function computeDistanceBetweenCombatants(a: Combatant, b: Combatant) {
  return Math.abs(a.position.coordinate - b.position.coordinate);
}
