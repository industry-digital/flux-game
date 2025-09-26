import { analyzeBattlefield } from './analysis';
import { optimizeMovementSequence } from './search';
import { createHeuristicProfile } from './heuristics';
import { findOptimalPlan } from './search';
import { calculateWeaponApCost } from '~/worldkit/combat/damage';
import { areEnemies } from '~/worldkit/combat/team';
import { filterValidTargets, chooseTarget } from './targeting';
import { computeDistanceBetweenCombatants } from '~/worldkit/combat/range';
import { canWeaponHitFromDistance } from '~/worldkit/combat/weapon';
import { isActorAlive } from '~/worldkit/entity/actor';

export type CombatPlanningDependencies = {
  analyzeBattlefield: typeof analyzeBattlefield;
  optimizeMovementSequence: typeof optimizeMovementSequence;
  createHeuristicProfile: typeof createHeuristicProfile;
  findOptimalPlan: typeof findOptimalPlan;
  calculateWeaponApCost: typeof calculateWeaponApCost;
  areEnemies: typeof areEnemies;
  filterValidTargets?: typeof filterValidTargets;
  chooseTarget?: typeof chooseTarget;
  computeDistanceBetweenCombatants: typeof computeDistanceBetweenCombatants;
  canWeaponHitFromDistance: typeof canWeaponHitFromDistance;
  isActorAlive: typeof isActorAlive;
};
export const DEFAULT_COMBAT_PLANNING_DEPS: CombatPlanningDependencies = {
  analyzeBattlefield,
  optimizeMovementSequence,
  createHeuristicProfile,
  findOptimalPlan,
  calculateWeaponApCost,
  areEnemies,
  filterValidTargets,
  chooseTarget,
  computeDistanceBetweenCombatants,
  canWeaponHitFromDistance,
  isActorAlive,
};
