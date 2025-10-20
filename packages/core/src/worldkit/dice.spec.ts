import { describe, it, expect } from 'vitest';
import { rollDiceWithRng, type RollDiceWithRngResult } from './dice';
import type { RollSpecification } from '~/types/dice';

describe('rollDiceWithRng', () => {
  describe('basic rolling', () => {
    it.each([
      ['1d4', 4, [3]],
      ['2d6', 6, [4, 4]],
      ['3d8', 8, [5, 5, 5]],
      ['1d10', 10, [6]],
      ['4d12', 12, [7, 7, 7, 7]],
      ['1d20', 20, [11]],
      ['1d100', 100, [51]],
    ] as const)('should roll %s correctly', (spec, dieSize, expectedValues) => {
      const deterministicRng = () => 0.5;

      const result = rollDiceWithRng(spec, deterministicRng);

      expect(result.values).toEqual(expectedValues);
      expect(result.sum).toBe(expectedValues.reduce((a, b) => a + b, 0));
      expect(result.bonus).toBe(0);
    });
  });

  describe('flat bonus handling', () => {
    it.each([
      ['1d4+1', [3], 4, 1],
      ['2d6+3', [4, 4], 11, 3],
      ['1d20+5', [11], 16, 5],
      ['3d8+10', [5, 5, 5], 25, 10],
      ['1d6+99', [4], 103, 99],
    ] as const)('should handle %s with bonus correctly', (spec, expectedValues, expectedSum, expectedBonus) => {
      const deterministicRng = () => 0.5;

      const result = rollDiceWithRng(spec, deterministicRng);

      expect(result.values).toEqual(expectedValues);
      expect(result.sum).toBe(expectedSum);
      expect(result.bonus).toBe(expectedBonus);
    });
  });

  describe('RNG behavior', () => {
    it('should call RNG function correct number of times', () => {
      let callCount = 0;
      const countingRng = () => {
        callCount++;
        return 0.5;
      };

      rollDiceWithRng('3d6', countingRng);

      expect(callCount).toBe(3);
    });

    it('should handle edge RNG values correctly', () => {
      let useMin = true;
      const edgeRng = () => {
        const value = useMin ? 0 : 0.999999;
        useMin = !useMin;
        return value;
      };

      const result = rollDiceWithRng('2d6', edgeRng);

      expect(result.values).toEqual([1, 6]); // min=1, max=6
      expect(result.sum).toBe(7);
      expect(result.bonus).toBe(0);
    });

    it('should produce different results with different RNG sequences', () => {
      let counter = 0;
      const sequentialRng = () => {
        const values = [0.1, 0.3, 0.7, 0.9];
        return values[counter++ % values.length];
      };

      const result = rollDiceWithRng('4d6', sequentialRng);

      expect(result.values).toEqual([1, 2, 5, 6]);
      expect(result.sum).toBe(14);
      expect(result.bonus).toBe(0);
    });
  });

  describe('output parameter reuse', () => {
    it('should reuse provided output object', () => {
      const output: RollDiceWithRngResult = { values: [], sum: 0, bonus: undefined };
      const deterministicRng = () => 0.5;

      const result = rollDiceWithRng('2d6+3', deterministicRng, output);

      expect(result).toBe(output);
      expect(output.values).toEqual([4, 4]);
      expect(output.sum).toBe(11);
      expect(output.bonus).toBe(3);
    });

    it('should reset output object properties', () => {
      const output: RollDiceWithRngResult = { values: [99, 99], sum: 999, bonus: 999 };
      const deterministicRng = () => 0.5;

      rollDiceWithRng('1d4', deterministicRng, output);

      expect(output.values).toEqual([3]);
      expect(output.sum).toBe(3);
      expect(output.bonus).toBe(0);
    });
  });

  describe('error handling', () => {
    it.each([
      'invalid',
      '2d',
      'd6',
      '2x6',
      '2d6-3',
      '2d6 + 3',
      '',
      '0d6',
      '2d0',
    ])('should throw error for invalid spec "%s"', (spec) => {
      const deterministicRng = () => 0.5;

      expect(() => rollDiceWithRng(spec as RollSpecification, deterministicRng)).toThrow();
    });
  });
});
