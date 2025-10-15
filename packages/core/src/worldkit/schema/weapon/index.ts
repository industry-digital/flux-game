// Re-export shared factory functions and types
export { createWeaponSchema, WeaponSchemaInput } from './factory';

// Export all specific weapon creation factories
export { createBowSchema } from './bow';
export { createDaggerSchema } from './dagger';
export { createSpearSchema } from './spear';
export { createSwordSchema } from './sword';
export { createWarhammerSchema } from './warhammer';
