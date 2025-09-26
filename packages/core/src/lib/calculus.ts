import { EasingFunction, Easing } from '~/types/easing';
import { GOLDEN_RATIO } from '~/types/world/constants';

/**
 * Generic function to compute the area under an easing curve using Simpson's rule integration.
 *
 * @param easingFunction - Function that takes normalized position t (0-1) and returns curve value
 * @param t - Normalized position on curve (0-1) - integration bounds are [0, t]
 * @param steps - Number of integration steps (must be even, defaults to 32)
 * @returns Area under the curve from 0 to t
 */
export function areaUnderCurve(
  easingFunction: EasingFunction,
  t: number,
  steps: number = 32
): number {
  // Validate inputs
  if (t < 0 || t > 1) {
    throw new Error(`Parameter t must be between 0 and 1, got ${t}`);
  }

  if (steps <= 0 || steps % 2 !== 0) {
    throw new Error(`Steps must be positive and even, got ${steps}`);
  }

  // Corner cases
  if (t === 0) return 0;
  if (t === 1 && steps === 0) return 0;

  // Fell through. Perform Simpson's rule integration from 0 to t.
  const h = t / steps; // Step size
  let sum = easingFunction(0) + easingFunction(t); // f(a) + f(b)

  // Add intermediate terms
  for (let i = 1; i < steps; i++) {
    const x = i * h;
    const coefficient = i % 2 === 0 ? 2 : 4; // Even indices get 2, odd get 4
    sum += coefficient * easingFunction(x);
  }

  return (h / 3) * sum;
}

const PEAK_CAPACITOR_RECOVERY_RATE_POSITION = 1 / (GOLDEN_RATIO * GOLDEN_RATIO);

/**
 * Combat-specific easing functions that extend the base Easing collection
 */
export const CombatEasing = {
  ...Easing,

  /**
   * Golden ratio recovery curve (peaks at φ⁻¹ ≈ 0.382)
   * Used in energy recovery mechanics from combat system
   * The capacitor recharges fastest at position `0.382`, and slowest at the extremities.
   * @param {Number} t - normalized value between `0` and `1` indicating a position on an easing curve
   */
  capacitorRecovery: (t: number): number => {
    const peak = PEAK_CAPACITOR_RECOVERY_RATE_POSITION;

    // Parabolic curve that peaks at 0.382
    if (t <= peak) {
      return t / peak;
    }

    // Steep drop-off in recovery rate as capacitor energy drops below 0.382
    return (1 - t) / (1 - peak);
  },

  /**
   * Power curve factory: f(t) = t^n
   */
  power: (exponent: number): EasingFunction => (t: number): number => Math.pow(t, exponent),

  /**
   * Normalized exponential curve factory: f(t) = (e^(kt) - 1) / (e^k - 1)
   */
  exponential: (k: number): EasingFunction => (t: number): number => {
    if (k === 0) return t; // Linear case
    return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
  }
} as const;
