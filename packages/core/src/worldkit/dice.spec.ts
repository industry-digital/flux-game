import { describe, it, expect } from 'vitest';
import { rollDiceWithRng, applyModifierToRollResult, applyModifiersToRollResult } from './dice';
import type { RollResult, RollResultWithoutModifiers, RollSpecification } from '~/types/dice';
import type { Modifier } from '~/types/modifier';
import { DEFAULT_TIMESTAMP } from '~/testing/constants';
import { createModifier } from '~/worldkit/entity/modifier';

const NOW = DEFAULT_TIMESTAMP;
const ONE_MINUTE_FROM_NOW = NOW + (1_000 * 60);

describe('rollDiceWithRng', () => {
  describe('basic rolling', () => {
    it.each([
      ['1d4', [3], 3, 0, 3],
      ['2d6', [4, 4], 8, 0, 8],
      ['3d8', [5, 5, 5], 15, 0, 15],
      ['1d20', [11], 11, 0, 11],
    ] as const)('should roll %s correctly', (spec, expectedValues, expectedNatural, expectedBonus, expectedResult) => {
      const deterministicRng = () => 0.5;

      const result = rollDiceWithRng(spec, deterministicRng);

      expect(result.dice).toBe(spec);
      expect(result.values).toEqual(expectedValues);
      expect(result.natural).toBe(expectedNatural);
      expect(result.bonus).toBe(expectedBonus);
      expect(result.result).toBe(expectedResult);
    });
  });

  describe('flat bonus handling', () => {
    it.each([
      ['1d4+1', [3], 3, 1, 4],
      ['2d6+3', [4, 4], 8, 3, 11],
      ['1d20+5', [11], 11, 5, 16],
      ['3d8+10', [5, 5, 5], 15, 10, 25],
    ] as const)('should handle %s with bonus correctly', (spec, expectedValues, expectedNatural, expectedBonus, expectedResult) => {
      const deterministicRng = () => 0.5;

      const result = rollDiceWithRng(spec, deterministicRng);

      expect(result.dice).toBe(spec);
      expect(result.values).toEqual(expectedValues);
      expect(result.natural).toBe(expectedNatural);
      expect(result.bonus).toBe(expectedBonus);
      expect(result.result).toBe(expectedResult);
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
      expect(result.natural).toBe(7);
      expect(result.result).toBe(7);
    });
  });

  describe('output parameter reuse', () => {
    it('should reuse provided output object', () => {
      const output: RollResultWithoutModifiers = {
        dice: '1d4',
        values: [],
        natural: 0,
        bonus: 0,
        result: 0,
      };
      const deterministicRng = () => 0.5;

      const result = rollDiceWithRng('2d6+3', deterministicRng, output);

      expect(result).toBe(output);
      expect(output.dice).toBe('2d6+3');
      expect(output.values).toEqual([4, 4]);
      expect(output.natural).toBe(8);
      expect(output.bonus).toBe(3);
      expect(output.result).toBe(11);
    });

    it('should reset output object properties', () => {
      const output: RollResultWithoutModifiers = {
        dice: '1d100+99',
        values: [99, 99],
        natural: 999,
        bonus: 999,
        result: 999,
      };
      const deterministicRng = () => 0.5;

      rollDiceWithRng('1d4', deterministicRng, output);

      expect(output.dice).toBe('1d4');
      expect(output.values).toEqual([3]);
      expect(output.natural).toBe(3);
      expect(output.bonus).toBe(0);
      expect(output.result).toBe(3);
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

describe('applyModifierToRollResult', () => {
  it('should apply a fixed modifier correctly', () => {
    const roll: RollResult = {
      dice: '1d6',
      values: [4],
      natural: 4,
      bonus: 0,
      result: 4,
    };
    const modifier: Modifier = createModifier({
      origin: 'stat:strength',
      value: 3,
      duration: -1,
      ts: NOW,
    });

    applyModifierToRollResult(roll, 'strength', modifier);

    expect(roll.mods).toEqual({ strength: modifier });
    expect(roll.result).toBe(7); // 4 + 0 + 3
  });

  it('should apply multiple modifiers correctly', () => {
    const roll: RollResult = {
      dice: '2d6+2',
      values: [3, 5],
      natural: 8,
      bonus: 2,
      result: 10,
    };
    const strengthMod: Modifier = createModifier({
      origin: 'stat:strength',
      value: 3,
      duration: -1,
      ts: NOW,
    });
    const weaponMod: Modifier = createModifier({
      origin: 'weapon:weapon',
      value: 1,
      duration: -1,
      ts: NOW,
    });

    applyModifierToRollResult(roll, 'strength', strengthMod);
    applyModifierToRollResult(roll, 'weapon', weaponMod);

    expect(roll.mods).toEqual({
      strength: strengthMod,
      weapon: weaponMod,
    });
    expect(roll.result).toBe(14); // 8 + 2 + 3 + 1
  });

  it('should initialize mods if undefined', () => {
    const roll: RollResult = {
      dice: '1d4',
      values: [2],
      natural: 2,
      bonus: 0,
      result: 2,
    };
    const modifier: Modifier = createModifier({
      origin: 'test:test',
      value: 1,
      duration: -1,
      ts: NOW,
    });

    applyModifierToRollResult(roll, 'test', modifier);

    expect(roll.mods).toBeDefined();
    expect(roll.mods!.test).toBe(modifier);
  });
});

describe('applyModifiersToRollResult', () => {
  it('should apply multiple modifiers at once', () => {
    const roll: RollResult = {
      dice: '1d20+1',
      values: [15],
      natural: 15,
      bonus: 1,
      result: 16,
    };
    const modifiers = {
      strength: { origin: 'stat:strength' as any, value: 4, ts: DEFAULT_TIMESTAMP, duration: -1 } as Modifier,
      proficiency: createModifier({
        origin: 'proficiency:proficiency',
        value: 2,
        duration: -1,
        ts: NOW,
      }),
      magic: createModifier({
        origin: 'magic:magic',
        value: 1,
        duration: -1,
        ts: NOW,
      }),
    };

    applyModifiersToRollResult(roll, modifiers);

    expect(roll.mods).toEqual(modifiers);
    expect(roll.result).toBe(23); // 15 + 1 + 4 + 2 + 1
  });

  it('should handle empty modifiers object', () => {
    const roll: RollResult = {
      dice: '1d6',
      values: [3],
      natural: 3,
      bonus: 0,
      result: 3,
    };

    applyModifiersToRollResult(roll, {});

    expect(roll.mods).toEqual({});
    expect(roll.result).toBe(3); // unchanged
  });

  it('should add to existing modifiers', () => {
    const existingModifier = createModifier({
      origin: 'existing:existing',
      value: 2,
      duration: -1,
      ts: NOW,
    });

    const newModifiers = {
      new1: createModifier({
        origin: 'new1:new1',
        value: 1,
        duration: -1,
        ts: NOW,
      }),
      new2: createModifier({
        origin: 'new2:new2',
        value: 3,
        duration: -1,
        ts: NOW,
      }),
    };

    const roll: RollResult = {
      dice: '1d8',
      values: [6],
      natural: 6,
      bonus: 0,
      result: 6,
      mods: {
        existing: existingModifier,
      },
    };

    applyModifiersToRollResult(roll, newModifiers);

    expect(roll.mods).toEqual({
      existing: existingModifier,
      new1: newModifiers.new1,
      new2: newModifiers.new2,
    });
    expect(roll.result).toBe(12); // 6 + 0 + 2 + 1 + 3
  });
});
