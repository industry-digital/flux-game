import { describe, it, expect } from 'vitest';
import { calculateAttackRating, ATTACK_SKILL_MULTIPLIER } from './attack';
import { Actor, Stat } from '~/types/entity/actor';
import { AccuracyModel, WeaponSchema } from '~/types/schema/weapon';
import { createTestWeapon } from '~/worldkit/combat/testing/weapon';
import { DamageModel, DamageType } from '~/types/damage';
import { MELEE_WEAPON_SKILL } from '~/worldkit/combat/testing/constants';

describe('Attack Rating Calculation', () => {
  const mockWeapon: WeaponSchema = createTestWeapon((schema: WeaponSchema) => ({
    ...schema,
    urn: 'flux:schema:weapon:test-sword',
    name: 'Test Sword',
    skill: MELEE_WEAPON_SKILL,
    baseMass: 2000,
    range: { optimal: 1 },
    accuracy: {
      model: AccuracyModel.SKILL_SCALING,
      base: '1d20',
    },
    damage: {
      model: DamageModel.STAT_SCALING,
      stat: Stat.POW,
      base: '1d6',
      efficiency: 0.5,
      types: {
        [DamageType.SLASH]: 1.0,
      },
    },
  }));

  const createMockActor = (skillRank: number): Actor => ({
    id: 'test-actor',
    name: 'Test Actor',
    location: 'test-location',
    hp: { eff: { cur: 100, max: 100 } },
    stats: {
      pow: { eff: 50 },
      fin: { eff: 50 },
      int: { eff: 50 },
      per: { eff: 50 },
    },
    skills: {
      [MELEE_WEAPON_SKILL]: {
        xp: 0,
        pxp: 0,
        rank: skillRank
      }
    },
    inventory: { items: [] }
  } as any);

  describe('Symmetric Rating Calculation', () => {
    it('should achieve perfect symmetry with max skill and max roll', () => {
      const masterActor = createMockActor(100); // Max skill
      const maxRoll = 20; // Max d20 roll

      const rating = calculateAttackRating(masterActor, mockWeapon, maxRoll);

      // Perfect master: 20 + (100 * 0.8) = 100
      expect(rating).toBe(100);
    });

    it('should use correct skill multiplier', () => {
      expect(ATTACK_SKILL_MULTIPLIER).toBe(0.8);
    });

    it('should calculate skill bonus correctly', () => {
      const testCases = [
        { skill: 0, roll: 10, expected: 10 },     // 10 + (0 * 0.8) = 10
        { skill: 25, roll: 10, expected: 30 },   // 10 + (25 * 0.8) = 30
        { skill: 50, roll: 10, expected: 50 },   // 10 + (50 * 0.8) = 50
        { skill: 75, roll: 10, expected: 70 },   // 10 + (75 * 0.8) = 70
        { skill: 100, roll: 10, expected: 90 },  // 10 + (100 * 0.8) = 90
      ];

      testCases.forEach(({ skill, roll, expected }) => {
        const actor = createMockActor(skill);
        const rating = calculateAttackRating(actor, mockWeapon, roll);
        expect(rating).toBe(expected);
      });
    });

    it('should handle full rating range correctly', () => {
      // Minimum possible: untrained with min roll
      const noviceActor = createMockActor(0);
      const minRating = calculateAttackRating(noviceActor, mockWeapon, 1);
      expect(minRating).toBe(1); // 1 + (0 * 0.8) = 1

      // Maximum possible: master with max roll
      const masterActor = createMockActor(100);
      const maxRating = calculateAttackRating(masterActor, mockWeapon, 20);
      expect(maxRating).toBe(100); // 20 + (100 * 0.8) = 100
    });

    it('should cap rating at 100 even if calculation exceeds', () => {
      // This shouldn't happen with normal parameters, but test the safety
      const actor = createMockActor(100);
      const rating = calculateAttackRating(actor, mockWeapon, 25); // Hypothetical >20 roll
      expect(rating).toBe(100); // Capped at maximum
    });
  });

  describe('Practical Balance Scenarios', () => {
    it('should create balanced combat for typical players', () => {
      // Typical player skill levels should achieve 33-66 rating range
      const typicalSkillLevels = [40, 50, 60];
      const averageRoll = 10.5; // Average of 1d20

      typicalSkillLevels.forEach(skill => {
        const actor = createMockActor(skill);
        const rating = calculateAttackRating(actor, mockWeapon, Math.round(averageRoll));

        // Should be in practical range for typical players
        expect(rating).toBeGreaterThanOrEqual(33);
        expect(rating).toBeLessThanOrEqual(66);
      });
    });

    it('should show meaningful skill progression', () => {
      const baseRoll = 10;
      let previousRating = 0;

      // Test progression through skill levels
      [0, 25, 50, 75, 100].forEach(skillLevel => {
        const actor = createMockActor(skillLevel);
        const rating = calculateAttackRating(actor, mockWeapon, baseRoll);

        // Each skill tier should exceed the previous
        expect(rating).toBeGreaterThan(previousRating);
        previousRating = rating;

        console.log(`Skill ${skillLevel}: ${rating} attack rating`);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing weapon skill gracefully', () => {
      const actorWithoutSkill: Actor = {
        ...createMockActor(0),
        skills: {} // No skills defined
      };

      const rating = calculateAttackRating(actorWithoutSkill, mockWeapon, 10);

      // Should default to 0 skill (getActorSkill returns rank: 0 for missing skills)
      expect(rating).toBe(10); // 10 + (0 * 0.8) = 10
    });
  });
});
