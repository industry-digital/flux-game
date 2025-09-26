// Combat System Barrel Export for Browser Sandbox
// This file exports all combat-related functionality needed for the single-page combat sandbox

export type {
  CombatPlanningDependencies,
} from './ai/deps';

export {
  DEFAULT_COMBAT_PLANNING_DEPS,
} from './ai/deps';

// === Core Combat Session Management ===
export {
  createCombatSession,
  createCombatSessionId,
  getCombatSession,
  createCombatSessionApi,
} from './session/session';

export type {
  CombatSessionInput,
  CombatSessionApi,
  CombatSessionOptions,
  CreateCombatSessionDependencies,
} from './session/session';

// === Combatant Interface ===
export {
  createCombatantApi,
  initializeCombatantAttributes,
  createCombatant,
} from './combatant';

export type {
  CombatantApi,
  CombatantAttributes,
} from './combatant';

// === Combat AI System ===
export {
  generateCombatPlan,
} from './ai/index';

export {
  analyzeBattlefield,
} from './ai/analysis';

export {
  computeMeleeCombatPlan,
} from './ai/melee';

export {
  computeReachCombatPlan,
} from './ai/reach';

export {
  computeRangedCombatPlan,
} from './ai/ranged';

// === Physics Integration ===
export {
  calculateMaxAp,
  cleanApPrecision,
} from './ap';

export {
  calculateMaxEnergy,
} from './energy';

export {
  canWeaponHitFromDistance,
  classifyWeapon,
} from './weapon';

export type {
  RangeClassification,
} from './weapon';

// === Combat Mechanics ===
export {
  computeDistanceBetweenCombatants,
} from './range';

export {
  computeInitiativeRolls,
} from './initiative';

export {
  ATTACK_ROLL_SPECIFICATION,
} from './dice';

// Re-export combat types from types package
export type {
  CombatSession,
  CombatSessionData,
  Combatant,
  CombatAction,
  Battlefield,
  BattlefieldPosition,
  ActionCost,
} from '~/types/combat';

export { CombatFacing, Team } from '~/types/combat';

export type {
  HeuristicProfile,
  HeuristicProfileFactory,
  PlanNode,
  PositionAssessment,
  ScoredPlan,
  SearchConfig,
  SearchEngine,
  SearchMetrics,
  TacticalSituation,
  TacticalSituationFactory,
  WeaponAssessment,
} from '~/types/combat-ai';

export {
  createIntentExecutionApi,
  ActionExecutionError,
} from './intent/execution';

export type {
  IntentExecutionApi,
} from './intent/execution';
