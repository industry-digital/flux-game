import { Actor, ShellStats } from '~/types/entity/actor';

export type Shell = {
  id: string;
  /**
   * The name of the shell (player-assigned).
   */
  name: string;
  stats: ShellStats;
  inventory: Actor['inventory'];
  equipment: Actor['equipment'];
};

export type ShellPerformanceProfile = {
  /**
   * Gap closing time in seconds
   * Short distance is about ~10 meters
   */
  gapClosing10: number;

  /**
   * Gap closing time in seconds
   * Long distance is about ~100 meters
   */
  gapClosing100: number;

  /**
   * Average speed in meters per second
   * Short distance is about ~10 meters
   */
  avgSpeed10: number;

  /**
   * Average speed in meters per second
   * Long distance is about ~100 meters
   */
  avgSpeed100: number;

  /**
   * Peak power output in watts
   */
  peakPowerOutput: number;

  /**
   * Component power draw in watts
   */
  componentPowerDraw: number;

  /**
   * Free power in watts (peakPowerOut - componentPowerDraw)
   */
  freePower: number;

  // === COMBAT EFFECTIVENESS ===

  /**
   * Damage per second (damage / AP cost)
   */
  weaponDps: number;

  /**
   * Weapon damage per strike
   */
  weaponDamage: number;

  /**
   * Action Point cost per weapon strike
   */
  weaponApCost: number;

  // === PHYSICAL CHARACTERISTICS ===

  /**
   * Total shell mass in kilograms (body + equipment + inventory)
   */
  totalMassKg: number;

  /**
   * Effective mass for acceleration calculations (reduced by FIN)
   */
  inertialMassKg: number;

  /**
   * Inertia reduction percentage from finesse (0-61.8%)
   */
  inertiaReduction: number;

  /**
   * Power-to-weight ratio (watts per kg)
   */
  powerToWeightRatio: number;

  /**
   * Maximum theoretical speed in m/s
   */
  topSpeed: number;

  /**
   * Maximum energy capacity in Joules
   */
  capacitorCapacity: number;

  /**
   * Maximum energy recovery rate in Watts (at t=~0.382)
   */
  maxRechargeRate: number;
};
