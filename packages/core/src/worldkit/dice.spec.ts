import { describe, it, expect, vi } from 'vitest';
import { createRollApi, DEFAULT_ROLL_API_DEPS } from './dice';
import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { Actor } from '~/types/entity/actor';
import { SkillState } from '~/types/entity/skill';
import { ATTACK_SKILL_MULTIPLIER } from '~/worldkit/combat/attack';
import { createActor } from '~/worldkit/entity/actor';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';

describe('rollWeaponAccuracy', () => {
  const mockActor: Actor = createActor({
    id: 'flux:actor:test-actor',
    name: 'Test Actor',
    skills: {},
  });

  const mockWeapon: WeaponSchema = createWeaponSchema({
    urn: 'flux:schema:weapon:test-sword',
    name: 'Test Sword',
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      skill: 'flux:schema:skill:weapon:melee',
      base: '1d20',
    },
  });

  it('should roll base dice and apply skill bonus', () => {
    const mockSkillState: SkillState = {
      xp: 0,
      pxp: 0,
      rank: 50,
      mods: {},
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
    expect(result.mods).toHaveProperty(`skill:${mockWeapon.accuracy.skill}`);
    expect(result.mods![`skill:${mockWeapon.accuracy.skill}`].value).toBe(expectedSkillBonus);

    // Verify final result
    expect(result.result).toBe(11 + expectedSkillBonus); // 11 + 40 = 51

    // Verify dependencies were called correctly
    expect(mockDeps.getActorSkill).toHaveBeenCalledWith(mockActor, mockWeapon.accuracy.skill);
    expect(mockDeps.getEffectiveSkillRank).toHaveBeenCalledWith(mockActor, mockWeapon.accuracy.skill, mockSkillState);
  });

  it('should handle zero skill rank', () => {
    const mockSkillState: SkillState = {
      xp: 0,
      pxp: 0,
      rank: 0,
      mods: {},
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
    expect(result.mods![`skill:${mockWeapon.accuracy.skill}`].value).toBe(0); // 0 * 0.8 = 0
    expect(result.result).toBe(19); // 19 + 0 = 19
  });

  it('should handle maximum skill rank', () => {
    const mockSkillState: SkillState = {
      xp: 0,
      pxp: 0,
      rank: 100,
      mods: {},
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
    expect(result.mods![`skill:${mockWeapon.accuracy.skill}`].value).toBe(expectedSkillBonus);
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
      mods: {},
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

    const skillModifier = result.mods![`skill:${mockWeapon.accuracy.skill}`];
    expect(skillModifier).toMatchObject({
      origin: `skill:${mockWeapon.accuracy.skill}`,
      value: 25 * ATTACK_SKILL_MULTIPLIER, // 25 * 0.8 = 20
      duration: -1, // Permanent
      ts: 4000000, // Uses injected timestamp
    });
  });
});
