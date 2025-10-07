import { Combatant, CombatCommand } from '~/types/combat';
import { WeaponSchema } from '~/types/schema/weapon';

/**
 * Helper to manage ammunition and reloading
 */
export function createAmmoManagementActions(
  combatant: Combatant,
  weapon: WeaponSchema,
  trace: string,
): CombatCommand[] {
  // TODO: Implement ammunition management
  // - Track current ammunition
  // - Reload when necessary
  // - Switch weapons when out of ammo
  return [];
}
