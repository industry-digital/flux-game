/**
 * Tactical Rounding Utilities for Combat Actions
 *
 * This module provides standardized rounding functions for combat mechanics
 * that prioritize tactical gameplay over mathematical precision.
 *
 * Design Philosophy:
 * - AP costs are always rounded UP (conservative, prevents exploitation)
 * - Distances are always rounded DOWN (conservative, prevents overreach)
 * - Positions remain whole numbers (grid-based tactical positioning)
 */

/**
 * Tactical AP precision factor.  This defines the core tactical grid precision for all combat actions.
 * A value of `10` produces `0.1` AP increments.
 */
export const TACTICAL_AP_PRECISION_FACTOR = 10;

/**
 * Minimum AP cost.  This is the smallest increment of AP that can be represented.
 */
export const MIN_AP_INCREMENT = 1 / TACTICAL_AP_PRECISION_FACTOR;

/**
 * Round AP cost up to nearest 0.1 AP
 *
 * This ensures players can never exploit fractional AP costs and creates
 * predictable AP expenditure for tactical planning.
 *
 * Examples:
 * - 1.0001 AP → 1.0 AP
 * - 1.95 AP → 2.0 AP
 * - 2.00 AP → 2.0 AP (no change)
 *
 * @param apCost - The AP cost to round up
 * @param precision - Number of decimal places to round to
 */
export function roundApCostUp(apCost: number): number {
  return Math.ceil(apCost * TACTICAL_AP_PRECISION_FACTOR) / TACTICAL_AP_PRECISION_FACTOR;
}
export type RoundingOptions = {
  precisionThreshold?: number;
}

/**
 * Precision errors less than these values are considered to be zero.
 */
const DISTANCE_DEFAULT_PRECISION_THRESHOLD = 0.001;

/**
 * Default rounding options
 */
export const DEFAULT_ROUNDING_OPTIONS: RoundingOptions = {
  precisionThreshold: DISTANCE_DEFAULT_PRECISION_THRESHOLD,
};

/**
 * Round distance down to nearest whole meter with smart precision handling
 *
 * This prevents players from gaining fractional movement advantages and
 * creates clear, tactical positioning on a meter-based grid. It also
 * intelligently handles floating-point precision errors.
 *
 * Examples:
 * - 5.99m → 5m (normal rounding down)
 * - 10.01m → 10m (normal rounding down)
 * - 6.000006m → 6m (precision error recognition)
 * - 5.999999m → 6m (precision error recognition)
 * - 15.00m → 15m (no change)
 */
export function roundDistanceDown(
  distance: number,
  options: RoundingOptions = DEFAULT_ROUNDING_OPTIONS,
): number {
  const { precisionThreshold = DISTANCE_DEFAULT_PRECISION_THRESHOLD } = options;
  const floor = Math.floor(distance);
  const fractional = distance - floor;

  // If very close to a whole number (likely precision error), round to it
  if (fractional < precisionThreshold || fractional > (1 - precisionThreshold)) {
    return Math.round(distance);
  }

  // Otherwise, round down as normal for tactical gameplay
  return floor;
}

/**
 * Round position down to nearest whole meter with smart precision handling
 *
 * Positions are distance-related, so they follow the same conservative
 * rounding rules as distances with intelligent precision error handling.
 * This prevents players from gaining fractional positioning advantages.
 */
export function roundPosition(
  position: number,
  options: RoundingOptions = DEFAULT_ROUNDING_OPTIONS,
): number {
  const { precisionThreshold = DISTANCE_DEFAULT_PRECISION_THRESHOLD } = options;
  const floor = Math.floor(position);
  const fractional = position - floor;

  // If very close to a whole number (likely precision error), round to it
  if (fractional < precisionThreshold || fractional > (1 - precisionThreshold)) {
    return Math.round(position);
  }

  // Otherwise, round down as normal for tactical gameplay
  return floor;
}

/**
 * Calculate tactical AP cost for a given distance
 *
 * Uses high-precision movement calculation internally, then applies
 * tactical rounding for gameplay consistency.
 */
export function calculateTacticalApCost(
  power: number,
  finesse: number,
  distance: number,
  mass: number,
  distanceToAp: (p: number, f: number, d: number, m: number) => number
): number {
  const preciseApCost = distanceToAp(power, finesse, distance, mass);
  return roundApCostUp(preciseApCost);
}

/**
 * Calculate tactical movement distance for given AP
 *
 * Uses high-precision movement calculation internally, then applies
 * tactical rounding for gameplay consistency.
 */
export function calculateTacticalDistance(
  power: number,
  finesse: number,
  ap: number,
  mass: number,
  apToDistance: (p: number, f: number, a: number, m: number) => number
): number {
  const preciseDistance = apToDistance(power, finesse, ap, mass);
  return roundDistanceDown(preciseDistance);
}

/**
 * Tactical Movement Result
 *
 * Encapsulates the result of tactical movement calculations with
 * both precise internal values and rounded tactical values.
 */
export type TacticalMovementResult = {
  // Precise values (for internal calculations, events, etc.)
  precise: {
    apCost: number;
    distance: number;
    position: number;
  };

  // Tactical values (for gameplay mechanics)
  tactical: {
    apCost: number;      // Rounded up to 0.1 AP
    distance: number;    // Rounded down to whole meters
    position: number;    // Rounded down to whole meters (distance-related)
  };
};

/**
 * Calculate complete tactical movement result
 *
 * Provides both precise values (for events/logging) and tactical values
 * (for gameplay mechanics) in a single calculation.
 */
export function calculateTacticalMovement(
  power: number,
  finesse: number,
  input: { type: 'distance'; distance: number } | { type: 'ap'; ap: number },
  mass: number,
  currentPosition: number,
  direction: 1 | -1, // 1 for forward, -1 for backward
  distanceToAp: (p: number, f: number, d: number, m: number) => number,
  apToDistance: (p: number, f: number, a: number, m: number) => number
): TacticalMovementResult {

  let preciseDistance: number;
  let preciseApCost: number;

  if (input.type === 'distance') {
    preciseDistance = input.distance;
    preciseApCost = distanceToAp(power, finesse, preciseDistance, mass);
  } else {
    preciseApCost = input.ap;
    preciseDistance = apToDistance(power, finesse, preciseApCost, mass);
  }

  const precisePosition = currentPosition + (direction * preciseDistance);

  return {
    precise: {
      apCost: preciseApCost,
      distance: preciseDistance,
      position: precisePosition,
    },
    tactical: {
      apCost: roundApCostUp(preciseApCost),
      distance: roundDistanceDown(preciseDistance),
      position: roundPosition(precisePosition),
    },
  };
}
