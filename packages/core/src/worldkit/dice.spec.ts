import { describe, it, expect, vi } from 'vitest';
import { createRollApi, DEFAULT_ROLL_API_DEPS, calculateAverageRollResult } from './dice';
import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { Actor } from '~/types/entity/actor';
import { SkillState } from '~/types/entity/skill';
import { ATTACK_SKILL_MULTIPLIER } from '~/worldkit/combat/attack';
import { createActor } from '~/worldkit/entity/actor';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';
import { MELEE_WEAPON_SKILL } from '~/worldkit/combat/testing/constants';
import { RollSpecification } from '~/types';

describe('rollWeaponAccuracy', () => {
  const mockActor: Actor = createActor({
    id: 'flux:actor:test-actor',
    name: 'Test Actor',
    skills: {},
  });

  const mockWeapon: WeaponSchema = createWeaponSchema({
    urn: 'flux:schema:weapon:test-sword',
    name: 'Test Sword',
    skill: MELEE_WEAPON_SKILL,
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      base: '1d20',
    },
  });

  it('should roll base dice and apply skill bonus', () => {
    const mockSkillState: SkillState = {
      xp: 0,
      pxp: 0,
      rank: 50,
    };

    const mockDeps = {
      ...DEFAULT_ROLL_API_DEPS,
      random: vi.fn(() => 0.5), // Will roll 10.5 -> 10 on 1d20
      timestamp: vi.fn(() => 1000000),
      getActorSkill: vi.fn(() => mockSkillState),
      getEffectiveSkillRank: vi.fn(() => 50),
    };

    const rollApi = createRollApi(mockDeps);
    const result = rollApi.rollWeaponAccuracy(mockActor, mockWeapon);

    // Verify base roll
    expect(result.dice).toBe('1d20');
    expect(result.values).toEqual([11]); // Math.floor(0.5 * 20) + 1 = 11
    expect(result.natural).toBe(11);
    expect(result.bonus).toBe(0);

    // Verify skill bonus calculation
    const expectedSkillBonus = 50 * ATTACK_SKILL_MULTIPLIER; // 50 * 0.8 = 40
    expect(result.mods).toHaveProperty(`skill:${mockWeapon.skill}`);
    expect(result.mods![`skill:${mockWeapon.skill}`].value).toBe(expectedSkillBonus);

    // Verify final result
    expect(result.result).toBe(11 + expectedSkillBonus); // 11 + 40 = 51

    // Verify dependencies were called correctly
    expect(mockDeps.getActorSkill).toHaveBeenCalledWith(mockActor, mockWeapon.skill);
    expect(mockDeps.getEffectiveSkillRank).toHaveBeenCalledWith(mockActor, mockWeapon.skill, mockSkillState);
  });

  it('should handle zero skill rank', () => {
    const mockSkillState: SkillState = {
      xp: 0,
      pxp: 0,
      rank: 0,
    };

    const mockDeps = {
      ...DEFAULT_ROLL_API_DEPS,
      random: vi.fn(() => 0.9), // Will roll 18.9 -> 18 on 1d20
      timestamp: vi.fn(() => 2000000),
      getActorSkill: vi.fn(() => mockSkillState),
      getEffectiveSkillRank: vi.fn(() => 0),
    };

    const rollApi = createRollApi(mockDeps);
    const result = rollApi.rollWeaponAccuracy(mockActor, mockWeapon);

    expect(result.natural).toBe(19); // Math.floor(0.9 * 20) + 1 = 19
    expect(result.mods![`skill:${mockWeapon.skill}`].value).toBe(0); // 0 * 0.8 = 0
    expect(result.result).toBe(19); // 19 + 0 = 19
  });

  it('should handle maximum skill rank', () => {
    const mockSkillState: SkillState = {
      xp: 0,
      pxp: 0,
      rank: 100,
    };

    const mockDeps = {
      ...DEFAULT_ROLL_API_DEPS,
      random: vi.fn(() => 0.05), // Will roll 1.05 -> 1 on 1d20
      timestamp: vi.fn(() => 3000000),
      getActorSkill: vi.fn(() => mockSkillState),
      getEffectiveSkillRank: vi.fn(() => 100),
    };

    const rollApi = createRollApi(mockDeps);
    const result = rollApi.rollWeaponAccuracy(mockActor, mockWeapon);

    expect(result.natural).toBe(2); // Math.floor(0.05 * 20) + 1 = 2
    const expectedSkillBonus = 100 * ATTACK_SKILL_MULTIPLIER; // 100 * 0.8 = 80
    expect(result.mods![`skill:${mockWeapon.skill}`].value).toBe(expectedSkillBonus);
    expect(result.result).toBe(2 + expectedSkillBonus); // 2 + 80 = 82
  });

  it('should throw error for unsupported accuracy model', () => {
    const invalidWeapon = {
      ...mockWeapon,
      accuracy: {
        model: 'INVALID_MODEL' as AccuracyModel,
        base: '1d20',
      },
    };

    const rollApi = createRollApi(DEFAULT_ROLL_API_DEPS);

    expect(() => {
      rollApi.rollWeaponAccuracy(mockActor, invalidWeapon as WeaponSchema);
    }).toThrow('Unsupported accuracy model: INVALID_MODEL');
  });

  it('should create proper modifier structure', () => {
    const mockSkillState: SkillState = {
      xp: 0,
      pxp: 0,
      rank: 25,
    };

    const mockDeps = {
      ...DEFAULT_ROLL_API_DEPS,
      random: vi.fn(() => 0.5),
      timestamp: vi.fn(() => 4000000),
      getActorSkill: vi.fn(() => mockSkillState),
      getEffectiveSkillRank: vi.fn(() => 25),
    };

    const rollApi = createRollApi(mockDeps);
    const result = rollApi.rollWeaponAccuracy(mockActor, mockWeapon);

    const skillModifier = result.mods![`skill:${mockWeapon.skill}`];
    expect(skillModifier).toMatchObject({
      origin: `skill:${mockWeapon.skill}`,
      value: 25 * ATTACK_SKILL_MULTIPLIER, // 25 * 0.8 = 20
      duration: -1, // Permanent
      ts: 4000000, // Uses injected timestamp
    });
  });
});

describe('calculateAverageRollResult', () => {
  type AverageRollResultTestCase = {
    dice: RollSpecification;
    expectedAverage: number;
    description: string;
  };

  describe.each<AverageRollResultTestCase>([
    // Basic single dice rolls
    { dice: '1d4', expectedAverage: 2.5, description: 'single d4' },
    { dice: '1d6', expectedAverage: 3.5, description: 'single d6' },
    { dice: '1d8', expectedAverage: 4.5, description: 'single d8' },
    { dice: '1d10', expectedAverage: 5.5, description: 'single d10' },
    { dice: '1d12', expectedAverage: 6.5, description: 'single d12' },
    { dice: '1d20', expectedAverage: 10.5, description: 'single d20' },
    { dice: '1d100', expectedAverage: 50.5, description: 'single d100' },

    // Multiple dice rolls
    { dice: '2d6', expectedAverage: 7, description: 'two d6' },
    { dice: '3d8', expectedAverage: 13.5, description: 'three d8' },
    { dice: '4d10', expectedAverage: 22, description: 'four d10' },
    { dice: '2d20', expectedAverage: 21, description: 'two d20' },

    // Dice with flat bonuses
    { dice: '1d6+1', expectedAverage: 4.5, description: 'single d6 with +1 bonus' },
    { dice: '1d6+5', expectedAverage: 8.5, description: 'single d6 with +5 bonus' },
    { dice: '2d8+3', expectedAverage: 12, description: 'two d8 with +3 bonus' },
    { dice: '3d10+10', expectedAverage: 26.5, description: 'three d10 with +10 bonus' },
    { dice: '1d20+15', expectedAverage: 25.5, description: 'single d20 with +15 bonus' },

    // Edge cases and comprehensive coverage
    { dice: '10d6', expectedAverage: 35, description: 'ten d6' },
    { dice: '1d100+50', expectedAverage: 100.5, description: 'single d100 with +50 bonus' },
    { dice: '5d4+2', expectedAverage: 14.5, description: 'five d4 with +2 bonus' },
    { dice: '1d12+1', expectedAverage: 7.5, description: 'single d12 with +1 bonus' },
    { dice: '20d10', expectedAverage: 110, description: 'twenty d10' },
  ])('should calculate correct average for $description', ({ dice, expectedAverage }) => {
    it(`calculates average of ${dice} as ${expectedAverage}`, () => {
      const result = calculateAverageRollResult(dice);
      expect(result).toBe(expectedAverage);
    });
  });
});
