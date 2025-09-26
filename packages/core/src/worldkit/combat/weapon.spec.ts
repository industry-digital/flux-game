import { describe, it, expect } from 'vitest';
import {
  calculateMaxRange,
  classifyWeapon,
  RangeClassification,
  canWeaponHitFromDistance,
  computeBestTacticForWeapon,
  WeaponTactic
} from './weapon';
import { createTestWeapon } from '~/worldkit/combat/testing/weapon';

describe('Weapon Classification and Range', () => {
  describe('calculateMaxRange', () => {
    it('should use explicit max when provided', () => {
      const weapon = createTestWeapon((w) => ({ ...w, range: { optimal: 10, max: 25 } }));
      expect(calculateMaxRange(weapon)).toBe(25);
    });

    it('should calculate falloff range when no explicit max', () => {
      const weapon = createTestWeapon((w) => ({ ...w, range: { optimal: 10, falloff: 5 } }));
      expect(calculateMaxRange(weapon)).toBe(25); // 10 + (3 * 5)
    });

    it('should use optimal range for weapons without falloff or max', () => {
      const meleeWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 1 } })); // melee weapon
      expect(calculateMaxRange(meleeWeapon)).toBe(1);

      const reachWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 2 } })); // reach weapon
      expect(calculateMaxRange(reachWeapon)).toBe(2);
    });

    it('should handle edge case with zero falloff', () => {
      const weapon = createTestWeapon((w) => ({ ...w, range: { optimal: 10, falloff: 0 } })); // optimal=10, falloff=0
      expect(calculateMaxRange(weapon)).toBe(10); // 10 + (3 * 0)
    });
  });

  describe('classifyWeapon', () => {
    it('should classify melee weapons correctly', () => {
      const meleeWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 1 } }));
      expect(classifyWeapon(meleeWeapon)).toBe(RangeClassification.MELEE);
    });

    it('should classify reach weapons correctly', () => {
      const reachWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 2 } }));
      expect(classifyWeapon(reachWeapon)).toBe(RangeClassification.REACH);
    });

    it('should classify ranged weapons correctly', () => {
      const rangedWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 10, falloff: 5 } }));
      expect(classifyWeapon(rangedWeapon)).toBe(RangeClassification.RANGED);
    });
  });

  describe('canWeaponHitFromDistance', () => {
    it('should handle melee weapons', () => {
      const meleeWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 1 } }));
      expect(canWeaponHitFromDistance(meleeWeapon, 0.5)).toBe(true);
      expect(canWeaponHitFromDistance(meleeWeapon, 1)).toBe(true);
      expect(canWeaponHitFromDistance(meleeWeapon, 1.5)).toBe(false);
    });

    it('should handle reach weapons', () => {
      const reachWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 2 } }));
      expect(canWeaponHitFromDistance(reachWeapon, 1)).toBe(false);
      expect(canWeaponHitFromDistance(reachWeapon, 2)).toBe(true);
      expect(canWeaponHitFromDistance(reachWeapon, 3)).toBe(false);
    });

    it('should handle ranged weapons with falloff', () => {
      const rangedWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 10, falloff: 5 } })); // effective range: 10 + (3 * 5) = 25
      expect(canWeaponHitFromDistance(rangedWeapon, 5)).toBe(true);
      expect(canWeaponHitFromDistance(rangedWeapon, 15)).toBe(true);
      expect(canWeaponHitFromDistance(rangedWeapon, 25)).toBe(true);
      expect(canWeaponHitFromDistance(rangedWeapon, 26)).toBe(false);
    });

    it('should handle ranged weapons with explicit max', () => {
      const rangedWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 10, falloff: 5, max: 20 } })); // max=20 overrides falloff calculation
      expect(canWeaponHitFromDistance(rangedWeapon, 19)).toBe(true);
      expect(canWeaponHitFromDistance(rangedWeapon, 20)).toBe(false);
    });
  });

  describe('computeBestTacticForWeapon', () => {
    it('should recommend close combat for melee weapons', () => {
      const meleeWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 1 } }));
      expect(computeBestTacticForWeapon(meleeWeapon)).toBe(WeaponTactic.CLOSE_COMBAT);
    });

    it('should recommend distance control for reach weapons', () => {
      const reachWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 2 } }));
      expect(computeBestTacticForWeapon(reachWeapon)).toBe(WeaponTactic.CONTROL_DISTANCE);
    });

    it('should recommend kiting for ranged weapons', () => {
      const rangedWeapon = createTestWeapon((w) => ({ ...w, range: { optimal: 10, falloff: 5 } }));
      expect(computeBestTacticForWeapon(rangedWeapon)).toBe(WeaponTactic.KITE_ENEMY);
    });
  });
});
