// Physics System Barrel Export for Combat Sandbox
// This file exports physics functionality needed for combat calculations

export {
  calculateGapClosing,
  calculateGapClosingWithDamage,
  calculateTopSpeed,
  calculateNonRealisticAcceleration as calculateAcceleration,
  calculatePeakPowerOutput,
  calculateInertiaReduction,
  calculateInertialMass,
  calculateMovementDistance,
  calculateMuscularKineticEnergy,
  calculateMomentumKineticEnergy,
  calculateWeaponEfficiency,
  calculateMomentumTransferEfficiency,
  calculateTotalDamage,
  damageToKineticEnergy,
  kineticEnergyToDamage,
  velocityForMomentumDamage,
  massForMomentumDamage,
  powerToWeightRatio,
  compareBuildEffectiveness,
} from './physics';

export {
  createMassApi as massApi,
  createMassComputationState,
  resetMassComputationState,
  collectDependenciesIterative,
  addObjectValuesToQueue,
  addEquipmentToQueue,
  addInventoryToQueue,
  computeAllMassesIterative,
  canComputeNow,
  allDependenciesComputed,
  allInventoryDependenciesComputed,
  computeSingleMass,
  sumMasses,
  sumInventoryMasses,
} from './mass';

export type {
  PhysicalEntity,
  MassComputationState,
  MassApi as MassComputationHook,
} from './mass';

export {
  MAX_INERTIA_REDUCTION,
  DEFAULT_STRIKE_DURATION,
  STRIKE_EFFICIENCY,
  JOULES_PER_DAMAGE,
} from './physics';
