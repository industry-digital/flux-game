import { WeaponSchema } from '~/types/schema/weapon';
import { WeaponSchemaURN } from '~/types/taxonomy';
import { SchemaManager } from '~/worldkit/schema/manager';

// Helper function to create a schema manager with weapons
export function registerWeapons(schemaManager: SchemaManager, weapons: WeaponSchema[]): SchemaManager {
  const weaponMap = new Map(weapons.map(weapon => [weapon.urn as WeaponSchemaURN, weapon]));
  schemaManager.registerLoader('weapon', () => weaponMap, true);
  return schemaManager;
};
