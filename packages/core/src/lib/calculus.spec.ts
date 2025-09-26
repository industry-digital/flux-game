import { describe, it, expect } from 'vitest';
import { areaUnderCurve, CombatEasing } from './calculus';
import { Easing } from '~/types/easing';

describe('areaUnderCurve', () => {
  describe('input validation', () => {
    it('should throw error for t < 0', () => {
      expect(() => areaUnderCurve(Easing.LINEAR, -0.1)).toThrow('Parameter t must be between 0 and 1');
    });

    it('should throw error for t > 1', () => {
      expect(() => areaUnderCurve(Easing.LINEAR, 1.1)).toThrow('Parameter t must be between 0 and 1');
    });

    it('should throw error for non-positive steps', () => {
      expect(() => areaUnderCurve(Easing.LINEAR, 0.5, 0)).toThrow('Steps must be positive and even');
      expect(() => areaUnderCurve(Easing.LINEAR, 0.5, -2)).toThrow('Steps must be positive and even');
    });

    it('should throw error for odd steps', () => {
      expect(() => areaUnderCurve(Easing.LINEAR, 0.5, 3)).toThrow('Steps must be positive and even');
      expect(() => areaUnderCurve(Easing.LINEAR, 0.5, 33)).toThrow('Steps must be positive and even');
    });
  });

  describe('edge cases', () => {
    it('should return 0 for t = 0', () => {
      expect(areaUnderCurve(Easing.LINEAR, 0)).toBe(0);
      expect(areaUnderCurve(Easing.QUADRATIC, 0)).toBe(0);
      expect(areaUnderCurve(Easing.CUBIC, 0)).toBe(0);
    });

    it('should handle t = 1 correctly', () => {
      // Linear: ∫₀¹ t dt = [t²/2]₀¹ = 0.5
      expect(areaUnderCurve(Easing.LINEAR, 1)).toBeCloseTo(0.5, 4);

      // Quadratic: ∫₀¹ t² dt = [t³/3]₀¹ = 1/3
      expect(areaUnderCurve(Easing.QUADRATIC, 1)).toBeCloseTo(1/3, 4);

      // Cubic: ∫₀¹ t³ dt = [t⁴/4]₀¹ = 0.25
      expect(areaUnderCurve(Easing.CUBIC, 1)).toBeCloseTo(0.25, 4);
    });
  });

  describe('known analytical solutions', () => {
    describe.each([
      { steps: 32, precision: 3 },
      { steps: 64, precision: 4 },
      { steps: 128, precision: 5 }
    ])('with $steps integration steps', ({ steps, precision }) => {
      it('should integrate linear function correctly', () => {
        // f(t) = t, ∫₀^t x dx = t²/2
        expect(areaUnderCurve(Easing.LINEAR, 0.5, steps)).toBeCloseTo(0.125, precision);
        expect(areaUnderCurve(Easing.LINEAR, 0.8, steps)).toBeCloseTo(0.32, precision);
        expect(areaUnderCurve(Easing.LINEAR, 1.0, steps)).toBeCloseTo(0.5, precision);
      });

      it('should integrate quadratic function correctly', () => {
        // f(t) = t², ∫₀^t x² dx = t³/3
        expect(areaUnderCurve(Easing.QUADRATIC, 0.5, steps)).toBeCloseTo(0.125/3, precision);
        expect(areaUnderCurve(Easing.QUADRATIC, 0.6, steps)).toBeCloseTo(0.216/3, precision);
        expect(areaUnderCurve(Easing.QUADRATIC, 1.0, steps)).toBeCloseTo(1/3, precision);
      });

      it('should integrate cubic function correctly', () => {
        // f(t) = t³, ∫₀^t x³ dx = t⁴/4
        expect(areaUnderCurve(Easing.CUBIC, 0.5, steps)).toBeCloseTo(0.0625/4, precision);
        expect(areaUnderCurve(Easing.CUBIC, 0.8, steps)).toBeCloseTo(0.4096/4, precision);
        expect(areaUnderCurve(Easing.CUBIC, 1.0, steps)).toBeCloseTo(0.25, precision);
      });

      it('should integrate constant function correctly', () => {
        const constant = (t: number) => 2; // f(t) = 2
        // ∫₀^t 2 dx = 2t
        expect(areaUnderCurve(constant, 0.3, steps)).toBeCloseTo(0.6, precision);
        expect(areaUnderCurve(constant, 0.7, steps)).toBeCloseTo(1.4, precision);
        expect(areaUnderCurve(constant, 1.0, steps)).toBeCloseTo(2.0, precision);
      });
    });
  });

  describe('easing function integration', () => {
    it('should integrate EASE_OUT_QUAD correctly', () => {
      // f(t) = 1 - (1-t)² = 2t - t²
      // ∫₀^t (2x - x²) dx = [x² - x³/3]₀^t = t² - t³/3
      const t = 0.6;
      const expected = t * t - (t * t * t) / 3;
      expect(areaUnderCurve(Easing.EASE_OUT_QUAD, t)).toBeCloseTo(expected, 3);
    });

    it('should integrate SINE function correctly', () => {
      // f(t) = sin(πt/2)
      // ∫₀^t sin(πx/2) dx = [-2cos(πx/2)/π]₀^t = (2/π)(1 - cos(πt/2))
      const t = 0.5; // At t=0.5, cos(π/4) = √2/2
      const expected = (2/Math.PI) * (1 - Math.cos(Math.PI * t / 2));
      expect(areaUnderCurve(Easing.SINE, t)).toBeCloseTo(expected, 3);
    });

    it('should integrate STEP function correctly', () => {
      // f(t) = t >= 1 ? 1 : 0
      // For t < 1, the function is 0 everywhere, so integral should be 0
      expect(areaUnderCurve(Easing.STEP, 0.5)).toBeCloseTo(0, 3);
      expect(areaUnderCurve(Easing.STEP, 0.9)).toBeCloseTo(0, 3);

      // For t = 1, the function is 1 only at the endpoint t=1
      // Simpson's rule will capture some area due to the endpoint value
      // The actual area should be very small but not exactly 0
      const result = areaUnderCurve(Easing.STEP, 1.0);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.1); // Should be small
    });
  });

  describe('combat-specific easing functions', () => {
    it('should integrate GOLDEN_RATIO_RECOVERY correctly', () => {
      // Test at key points of the golden ratio curve
      const phi = (1 + Math.sqrt(5)) / 2;
      const peak = 1 / phi; // ≈ 0.618

      // At the peak, the function should have maximum value
      const areaToPeak = areaUnderCurve(CombatEasing.capacitorRecovery, peak);
      const areaAfterPeak = areaUnderCurve(CombatEasing.capacitorRecovery, peak + 0.1);

      expect(areaToPeak).toBeGreaterThan(0);
      expect(areaAfterPeak).toBeGreaterThan(areaToPeak);
    });

    it('should integrate power curves correctly', () => {
      // Power curve with exponent 2 should match QUADRATIC
      const power2 = CombatEasing.power(2);
      const t = 0.7;
      const powerResult = areaUnderCurve(power2, t);
      const quadResult = areaUnderCurve(Easing.QUADRATIC, t);

      expect(powerResult).toBeCloseTo(quadResult, 4);
    });

    it('should integrate exponential curves correctly', () => {
      // Exponential with k=0 should be linear
      const exp0 = CombatEasing.exponential(0);
      const t = 0.6;
      const expResult = areaUnderCurve(exp0, t);
      const linearResult = areaUnderCurve(Easing.LINEAR, t);

      expect(expResult).toBeCloseTo(linearResult, 4);
    });
  });

  describe('integration accuracy with different step counts', () => {
    it.each([
      { steps: 2, expectedPrecision: 1 },
      { steps: 8, expectedPrecision: 2 },
      { steps: 32, expectedPrecision: 3 },
      { steps: 128, expectedPrecision: 4 }
    ])('should improve accuracy with more steps: $steps steps', ({ steps, expectedPrecision }) => {
      // Test with quadratic function where we know the exact answer
      const t = 0.8;
      const expected = (t * t * t) / 3; // ∫₀^t x² dx = t³/3
      const result = areaUnderCurve(Easing.QUADRATIC, t, steps);

      expect(result).toBeCloseTo(expected, expectedPrecision);
    });
  });

  describe('monotonicity properties', () => {
    it('should produce monotonically increasing areas for increasing t', () => {
      const tValues = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
      const areas = tValues.map(t => areaUnderCurve(Easing.LINEAR, t));

      // Each area should be >= the previous one
      for (let i = 1; i < areas.length; i++) {
        expect(areas[i]).toBeGreaterThanOrEqual(areas[i - 1]);
      }
    });

    it('should handle non-monotonic functions correctly', () => {
      // GOLDEN_RATIO_RECOVERY peaks and then decreases
      const areas = [0.2, 0.4, 0.6, 0.8, 1.0].map(t =>
        areaUnderCurve(CombatEasing.capacitorRecovery, t)
      );

      // Areas should still be monotonically increasing (integration accumulates)
      for (let i = 1; i < areas.length; i++) {
        expect(areas[i]).toBeGreaterThan(areas[i - 1]);
      }
    });
  });
});
