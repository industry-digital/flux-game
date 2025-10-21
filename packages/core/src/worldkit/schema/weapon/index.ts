// Re-export shared factory functions and types
export { createWeaponSchema, WeaponSchemaInput } from './factory';

// Export all specific weapon creation factories
export { createDaggerSchema } from './dagger';
export { createSpearSchema } from './spear';
export { createSwordSchema } from './sword';
export { createWarhammerSchema } from './warhammer';

// Export bare hands weapon schema
export { BARE_HANDS_WEAPON_DO_NOT_DELETE } from './bare-hands';
