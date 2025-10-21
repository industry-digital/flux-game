import { Shell } from '~/types/entity/shell';
import { Actor, Stat } from '~/types/entity/actor';
import { ShellPerformanceProfile } from '~/types/shell';
import { calculateMovementTime } from '~/worldkit/physics/movement';
import { calculateWeaponDps, calculateAverageWeaponDamagePerHit } from '~/worldkit/combat/damage/resolution';
import { calculateWeaponApCost } from '~/worldkit/combat/ap';
import { calculatePeakPowerOutput, calculateInertialMass, calculateTopSpeed } from '~/worldkit/physics/physics';
import { MassApi } from '~/worldkit/physics/mass';
import { ActorEquipmentApi } from '~/worldkit/entity/actor/equipment';
import { getMaxEnergy, getMaxRecoveryRate } from '~/worldkit/entity/actor/capacitor';
import { getShellStatValue, getShellNaturalStatValue } from '~/worldkit/entity/actor/shell';
import { WeaponTimer } from '~/types/schema/weapon';

/**
 * Predefined distances for performance analysis, in meters
 */
export const TACTICAL_DISTANCES = {
  SHORT_RANGE: 10,   // Close quarters engagement
  MEDIUM_RANGE: 50,  // Urban combat range
  LONG_RANGE: 100,   // Extended engagement
} as const;

/**
 * Performance calculation dependencies
 */
export type ShellPerformanceDependencies = {
  massApi: MassApi;
  equipmentApi: ActorEquipmentApi;
};

/**
 * Calculate comprehensive shell performance profile
 * Connects stat configuration to meaningful combat metrics
 */
export function calculateShellPerformance(
  actor: Actor,
  shell: Shell,
  deps: ShellPerformanceDependencies
): ShellPerformanceProfile {
  const { massApi, equipmentApi } = deps;

  // Get natural stat values using helper functions
  const naturalPowStat = getShellNaturalStatValue(shell, Stat.POW);
  const naturalFinStat = getShellNaturalStatValue(shell, Stat.FIN);
  const naturalResStat = getShellNaturalStatValue(shell, Stat.RES);

  // Get effective stat values using helper functions
  const effectivePowStat = getShellStatValue(shell, Stat.POW);
  const effectiveFinStat = getShellStatValue(shell, Stat.FIN);
  const effectiveResStat = getShellStatValue(shell, Stat.RES);

  // Calculate total mass in kilograms for physics
  const totalMassKg = massApi.computeCombatMass(actor);

  // Get equipped weapon for damage calculations
  const equippedWeaponSchema = equipmentApi.getEquippedWeaponSchema(actor);
  const weaponMassKg = equippedWeaponSchema.baseMass / 1_000;

  // === MOVEMENT PERFORMANCE ===

  // Gap closing times for tactical distances
  const gapClosing10 = calculateMovementTime(effectivePowStat, effectiveFinStat, TACTICAL_DISTANCES.SHORT_RANGE, totalMassKg);
  const gapClosing100 = calculateMovementTime(effectivePowStat, effectiveFinStat, TACTICAL_DISTANCES.LONG_RANGE, totalMassKg);

  // Average speeds over tactical distances
  const avgSpeed10 = TACTICAL_DISTANCES.SHORT_RANGE / gapClosing10;
  const avgSpeed100 = TACTICAL_DISTANCES.LONG_RANGE / gapClosing100;

  // === POWER & ENERGY PERFORMANCE ===

  // Peak power output from POW stat
  const peakPowerOutput = calculatePeakPowerOutput(effectivePowStat);

  // Component power draw (equipment burden)
  // This is a simplified calculation - in a full system, each component would have power requirements
  const componentPowerDraw = calculateComponentPowerDraw(shell, equippedWeaponSchema);

  // Free power available for other systems
  const freePower = Math.max(0, peakPowerOutput - componentPowerDraw);

  // === COMBAT EFFECTIVENESS ===

  // Weapon damage and AP costs
  const weaponDamage = calculateAverageWeaponDamagePerHit(actor, equippedWeaponSchema);
  const weaponApCost = calculateWeaponApCost(actor, equippedWeaponSchema, WeaponTimer.ATTACK);
  const weaponDps = calculateWeaponDps(actor, equippedWeaponSchema);

  // === DERIVED METRICS ===

  // Power-to-weight ratio (key performance indicator)
  const powerToWeightRatio = peakPowerOutput / totalMassKg;

  // Inertial mass for acceleration (FIN reduces effective mass)
  const inertialMassKg = calculateInertialMass(effectiveFinStat, totalMassKg);
  const inertiaReduction = ((totalMassKg - inertialMassKg) / totalMassKg) * 100;

  // Top speed potential
  const topSpeed = calculateTopSpeed(effectivePowStat);

  // === ENERGY SYSTEM METRICS ===

  // Capacitor capacity and recharge rate (based on RES stat)
  const capacitorCapacity = getMaxEnergy(actor);
  const maxRechargeRate = getMaxRecoveryRate(actor);

  return {
    naturalPowStat,
    naturalFinStat,
    naturalResStat,
    effectivePowStat,
    effectiveFinStat,
    effectiveResStat,
    // Core movement metrics (existing interface)
    gapClosing10,
    gapClosing100,
    avgSpeed10,
    avgSpeed100,
    peakPowerOutput,
    componentPowerDraw,
    freePower,

    // Extended performance metrics
    weaponDamage,
    weaponApCost,
    weaponDps,
    totalMassKg,
    inertialMassKg,
    inertiaReduction,
    powerToWeightRatio,
    topSpeed,

    // Energy system metrics
    capacitorCapacity,
    maxRechargeRate,
  };
}

/**
 * Calculate component power draw based on equipped items
 * This is a simplified version - full implementation would query component schemas
 */
function calculateComponentPowerDraw(shell: Shell, weaponSchema: any): number {
  let powerDraw = 0;

  // Base shell systems power draw
  powerDraw += 50; // Basic life support, sensors, etc.

  // Weapon power draw (if any)
  if (weaponSchema?.powerDraw) {
    powerDraw += weaponSchema.powerDraw;
  } else if (weaponSchema) {
    // Estimate based on weapon mass - heavier weapons need more power
    const weaponMassKg = weaponSchema.mass / 1000;
    powerDraw += weaponMassKg * 10; // 10W per kg of weapon
  }

  // Equipment power draw
  // In a full system, this would iterate through all equipped components
  const equipmentCount = Object.keys(shell.equipment).length;
  powerDraw += equipmentCount * 25; // 25W per equipped item

  return powerDraw;
}
