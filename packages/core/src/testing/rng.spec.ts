import { describe, it, expect } from 'vitest';
import { createDeterministicRng, createCyclingRng, RNG_PATTERNS } from './rng';

describe('Deterministic RNG Utilities', () => {
  describe('createDeterministicRng', () => {
    it('should return values in sequence', () => {
      const output = [0.1, 0.5, 0.9];
      const rng = createDeterministicRng(output);

      expect(rng()).toBe(0.1);
      expect(rng()).toBe(0.5);
      expect(rng()).toBe(0.9);
    });

    it('should throw error when exhausted', () => {
      const output = [0.3, 0.7];
      const rng = createDeterministicRng(output);

      rng(); // 0.3
      rng(); // 0.7

      expect(() => rng()).toThrow('RNG exhausted: attempted to get value at index 2, but only 2 values provided');
    });

    it('should validate input values are in Math.random() range', () => {
      expect(() => createDeterministicRng([-0.1])).toThrow('Invalid RNG value: -0.1. All values must be in range [0, 1)');
      expect(() => createDeterministicRng([1.0])).toThrow('Invalid RNG value: 1. All values must be in range [0, 1)');
      expect(() => createDeterministicRng([1.5])).toThrow('Invalid RNG value: 1.5. All values must be in range [0, 1)');
    });

    it('should accept valid boundary values', () => {
      const rng = createDeterministicRng([0, 0.999999]);

      expect(rng()).toBe(0);
      expect(rng()).toBe(0.999999);
    });
  });

  describe('createCyclingRng', () => {
    it('should cycle through values repeatedly', () => {
      const output = [0.2, 0.8];
      const rng = createCyclingRng(output);

      // First cycle
      expect(rng()).toBe(0.2);
      expect(rng()).toBe(0.8);

      // Second cycle
      expect(rng()).toBe(0.2);
      expect(rng()).toBe(0.8);

      // Third cycle
      expect(rng()).toBe(0.2);
    });

    it('should handle single value cycling', () => {
      const rng = createCyclingRng([0.5]);

      expect(rng()).toBe(0.5);
      expect(rng()).toBe(0.5);
      expect(rng()).toBe(0.5);
    });

    it('should throw error for empty array', () => {
      expect(() => createCyclingRng([])).toThrow('RNG output array cannot be empty');
    });

    it('should validate input values are in Math.random() range', () => {
      expect(() => createCyclingRng([-0.1])).toThrow('Invalid RNG value: -0.1. All values must be in range [0, 1)');
      expect(() => createCyclingRng([1.0])).toThrow('Invalid RNG value: 1. All values must be in range [0, 1)');
    });
  });

  describe('RNG_PATTERNS', () => {
    it('should provide valid pattern arrays', () => {
      // Test that all patterns contain valid values
      Object.values(RNG_PATTERNS).forEach(pattern => {
        pattern.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(1);
        });
      });
    });

    it('should work with createDeterministicRng', () => {
      const rng = createDeterministicRng(RNG_PATTERNS.middle);
      expect(rng()).toBe(0.5);
    });

    it('should work with createCyclingRng', () => {
      const rng = createCyclingRng(RNG_PATTERNS.alternating);

      expect(rng()).toBe(0.1); // First low
      expect(rng()).toBe(0.9); // First high
      expect(rng()).toBe(0.2); // Second low
      expect(rng()).toBe(0.8); // Second high
    });

    it('should have expected pattern characteristics', () => {
      // Middle pattern should be neutral
      expect(RNG_PATTERNS.middle).toEqual([0.5]);

      // Low pattern should have values < 0.5
      RNG_PATTERNS.low.forEach(value => {
        expect(value).toBeLessThan(0.5);
      });

      // High pattern should have values > 0.5
      RNG_PATTERNS.high.forEach(value => {
        expect(value).toBeGreaterThan(0.5);
      });

      // Ascending should be in ascending order
      const ascending = RNG_PATTERNS.ascending;
      for (let i = 1; i < ascending.length; i++) {
        expect(ascending[i]).toBeGreaterThan(ascending[i - 1]);
      }

      // Descending should be in descending order
      const descending = RNG_PATTERNS.descending;
      for (let i = 1; i < descending.length; i++) {
        expect(descending[i]).toBeLessThan(descending[i - 1]);
      }
    });
  });

  describe('Integration with existing testing patterns', () => {
    it('should work as a drop-in replacement for Math.random', () => {
      const mockRandom = createDeterministicRng([0.25, 0.75]);

      // Simulate dice roll logic that might use Math.random()
      const rollD20 = (random: () => number) => Math.floor(random() * 20) + 1;

      expect(rollD20(mockRandom)).toBe(6);  // 0.25 * 20 + 1 = 6
      expect(rollD20(mockRandom)).toBe(16); // 0.75 * 20 + 1 = 16
    });

    it('should provide reproducible sequences for testing', () => {
      const sequence = [0.1, 0.3, 0.7, 0.9];

      // Create two identical RNG instances
      const rng1 = createDeterministicRng([...sequence]);
      const rng2 = createDeterministicRng([...sequence]);

      // They should produce identical results
      for (let i = 0; i < sequence.length; i++) {
        expect(rng1()).toBe(rng2());
      }
    });
  });
});
