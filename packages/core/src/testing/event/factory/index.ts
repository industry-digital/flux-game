// Export all factory functions
export {
  createCombatantDidAttackEvent,
  createCombatantWasAttackedEvent,
  createCombatantDidDieEvent,
  createCombatantDidDefendEvent,
  createCombatantDidAcquireTargetEvent,
  createCombatantDidMoveEvent,
  createCombatantDidRecoverApEvent,
  createCombatTurnDidStartEvent,
  createCombatTurnDidEndEvent,
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
  CombatTurnDidStartTransform,
  CombatTurnDidEndTransform,
} from './combat';

// Export dependencies
export {
  DEFAULT_COMBAT_EVENT_FACTORY_DEPS,
} from './deps';

export type {
  CombatEventFactoryDependencies,
} from './deps';
