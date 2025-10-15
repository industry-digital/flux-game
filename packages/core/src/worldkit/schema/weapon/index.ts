// Re-export shared factory functions and types
export { createWeaponSchema, WeaponSchemaInput } from './factory';

// Export all specific weapon creation factories
export { createBowSchema } from './bow';
export { createDaggerSchema } from './dagger';
export { createSpearSchema } from './spear';
export { createSwordSchema } from './sword';
export { createWarhammerSchema } from './warhammer';

// Export bare hands weapon schema
export { BARE_HANDS_WEAPON_SCHEMA } from './bare-hands';
