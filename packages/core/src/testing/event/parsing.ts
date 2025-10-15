import { EventType, WorldEvent } from '~/types/event';

/**
 * Generic helper to extract events of a specific type from a collection of world events.
 * Useful for testing combat actions that emit multiple event types.
 *
 * @param events - Array of world events to filter
 * @param eventType - The specific event type to extract
 * @returns Array of events matching the specified type
 *
 * @example
 * ```typescript
 * const attackEvents = extractEventsByType(result, EventType.COMBATANT_DID_ATTACK);
 * const damageEvents = extractEventsByType(result, EventType.COMBATANT_WAS_ATTACKED);
 * const deathEvents = extractEventsByType(result, EventType.COMBATANT_DID_DIE);
 * ```
 */
export function extractEventsByType<T extends WorldEvent>(
  events: WorldEvent[],
  eventType: EventType
): T[] {
  return events.filter(e => e.type === eventType) as T[];
}

/**
 * Helper to extract the first event of a specific type from a collection of world events.
 * Useful for testing single-target actions where you expect exactly one event of a type.
 *
 * @param events - Array of world events to search
 * @param eventType - The specific event type to extract
 * @returns The first event matching the specified type, or undefined if none found
 *
 * @example
 * ```typescript
 * const attackEvent = extractFirstEventOfType<CombatantDidAttack>(result, EventType.COMBATANT_DID_ATTACK);
 * const damageEvent = extractFirstEventOfType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);
 * const deathEvent = extractFirstEventOfType<CombatantDidDie>(result, EventType.COMBATANT_DID_DIE);
 * ```
 */
export function extractFirstEventOfType<T extends WorldEvent>(
  events: WorldEvent[],
  eventType: EventType
): T | undefined {
  return events.find(e => e.type === eventType) as T | undefined;
}
