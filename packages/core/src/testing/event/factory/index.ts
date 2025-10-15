// Export all factory functions
export {
  createCombatantDidAttackEvent,
  createCombatantWasAttackedEvent,
  createCombatantDidDieEvent,
  createCombatantDidDefendEvent,
  createCombatantDidAcquireTargetEvent,
  createCombatantDidMoveEvent,
  createCombatantDidRecoverApEvent,
} from './combat';

// Export transform types
export type {
  CombatantDidAttackTransform,
  CombatantWasAttackedTransform,
  CombatantDidDieTransform,
  CombatantDidDefendTransform,
  CombatantDidAcquireTargetTransform,
  CombatantDidMoveTransform,
  CombatantDidRecoverApTransform,
} from './combat';

// Export dependencies
export {
  DEFAULT_COMBAT_EVENT_FACTORY_DEPS,
} from './deps';

export type {
  CombatEventFactoryDependencies,
} from './deps';
