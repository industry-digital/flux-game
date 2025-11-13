import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCurrentHp,
  getMaxHp,
  isAlive,
  isDead,
  getHealthPercentage,
  setCurrentHp,
  setMaxHp,
  decrementHp,
  incrementHp,
  setHealthPercentage,
  restoreHpToMax,
  getResBonus,
  calculateMaxHpFromRes,
  updateMaxHpFromRes,
  initializeHpFromRes,
  BASE_HP,
  HP_PER_RES_BONUS,
} from './health';
import { createActor } from './factory';
import { setStatValue } from './stats';
import { Actor, ActorType, Stat } from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';

describe('Actor Health Pure Functions', () => {
  let actor: Actor;
  const actorId: ActorURN = 'flux:actor:test-health' as ActorURN;

  beforeEach(() => {
    actor = createActor({
      id: actorId,
      name: 'Test Actor',
      kind: ActorType.PC,
      hp: {
        current: 100,
        max: 100,
      },
    });
  });

  describe('getCurrentHp', () => {
    it('should return current effective HP', () => {
      expect(getCurrentHp(actor)).toBe(100);
    });

    it('should reflect changes to effective HP', () => {
      setCurrentHp(actor, 75);
      expect(getCurrentHp(actor)).toBe(75);
    });
  });

  describe('getMaxHp', () => {
    it('should return maximum effective HP', () => {
      expect(getMaxHp(actor)).toBe(100);
    });

    it('should reflect changes to effective max HP', () => {
      setMaxHp(actor, 120);
      expect(getMaxHp(actor)).toBe(120);
    });
  });

  describe('isAlive', () => {
    it('should return true when HP > 0', () => {
      expect(isAlive(actor)).toBe(true);
    });

    it('should return false when HP = 0', () => {
      setCurrentHp(actor, 0);
      expect(isAlive(actor)).toBe(false);
    });

    it('should return false when HP < 0', () => {
      setCurrentHp(actor, -10);
      expect(isAlive(actor)).toBe(false);
    });
  });

  describe('isDead', () => {
    it('should return false when HP > 0', () => {
      expect(isDead(actor)).toBe(false);
    });

    it('should return true when HP = 0', () => {
      setCurrentHp(actor, 0);
      expect(isDead(actor)).toBe(true);
    });

    it('should return true when HP < 0', () => {
      setCurrentHp(actor, -10);
      expect(isDead(actor)).toBe(true);
    });
  });

  describe('getHealthPercentage', () => {
    it('should return 1.0 when at full health', () => {
      expect(getHealthPercentage(actor)).toBe(1.0);
    });

    it('should return 0.5 when at half health', () => {
      setCurrentHp(actor, 50);
      expect(getHealthPercentage(actor)).toBe(0.5);
    });

    it('should return 0 when at zero health', () => {
      setCurrentHp(actor, 0);
      expect(getHealthPercentage(actor)).toBe(0);
    });

    it('should return 0 when max HP is 0', () => {
      setMaxHp(actor, 0);
      setCurrentHp(actor, 0);
      expect(getHealthPercentage(actor)).toBe(0);
    });
  });

  describe('setCurrentHp', () => {
    it('should set current HP to specified value', () => {
      setCurrentHp(actor, 75);

      expect(getCurrentHp(actor)).toBe(75);
    });

    it('should clamp HP to maximum', () => {
      setCurrentHp(actor, 150);
      expect(getCurrentHp(actor)).toBe(100);
    });

    it('should clamp HP to minimum (0)', () => {
      setCurrentHp(actor, -25);
      expect(getCurrentHp(actor)).toBe(0);
    });
  });

  describe('setMaxHp', () => {
    it('should set maximum HP to specified value', () => {
      setMaxHp(actor, 120);

      expect(getMaxHp(actor)).toBe(120);
    });

    it('should not allow negative maximum HP', () => {
      setMaxHp(actor, -50);
      expect(getMaxHp(actor)).toBe(0);
    });

    it('should reduce current HP if it exceeds new maximum', () => {
      setMaxHp(actor, 80);
      expect(getCurrentHp(actor)).toBe(80);
      expect(getMaxHp(actor)).toBe(80);
    });
  });

  describe('decrementHp', () => {
    it('should reduce HP by specified amount', () => {
      decrementHp(actor, 25);
      expect(getCurrentHp(actor)).toBe(75);
    });

    it('should handle negative amounts as positive', () => {
      decrementHp(actor, -25);
      expect(getCurrentHp(actor)).toBe(75);
    });

    it('should not reduce HP below 0', () => {
      decrementHp(actor, 150);
      expect(getCurrentHp(actor)).toBe(0);
    });
  });

  describe('incrementHp', () => {
    it('should increase HP by specified amount', () => {
      setCurrentHp(actor, 50);
      incrementHp(actor, 25);
      expect(getCurrentHp(actor)).toBe(75);
    });

    it('should handle negative amounts as positive', () => {
      setCurrentHp(actor, 50);
      incrementHp(actor, -25);
      expect(getCurrentHp(actor)).toBe(75);
    });

    it('should not increase HP above maximum', () => {
      setCurrentHp(actor, 90);
      incrementHp(actor, 25);
      expect(getCurrentHp(actor)).toBe(100);
    });
  });

  describe('setHealthPercentage', () => {
    it('should set HP to percentage of maximum', () => {
      setHealthPercentage(actor, 0.75);
      expect(getCurrentHp(actor)).toBe(75);
    });

    it('should clamp percentage to 0-1 range', () => {
      setHealthPercentage(actor, 1.5);
      expect(getCurrentHp(actor)).toBe(100);

      setHealthPercentage(actor, -0.5);
      expect(getCurrentHp(actor)).toBe(0);
    });

    it('should work with different maximum HP values', () => {
      setMaxHp(actor, 200);
      setHealthPercentage(actor, 0.6);
      expect(getCurrentHp(actor)).toBe(120);
    });
  });

  describe('restoreHpToMax', () => {
    it('should set current HP to maximum', () => {
      setCurrentHp(actor, 25);
      restoreHpToMax(actor);
      expect(getCurrentHp(actor)).toBe(100);
    });

    it('should work with different maximum HP values', () => {
      setMaxHp(actor, 150);
      setCurrentHp(actor, 50);
      restoreHpToMax(actor);
      expect(getCurrentHp(actor)).toBe(150);
    });
  });

  describe('RES-based HP calculations', () => {
    beforeEach(() => {
      // Set up actor with specific RES values for testing
      setStatValue(actor, Stat.RES, 14); // +2 bonus
    });

    describe('getResBonus', () => {
      it('should calculate RES bonus correctly', () => {
        expect(getResBonus(actor)).toBe(2); // (14 - 10) / 2 = 2
      });

      it('should handle baseline RES (10)', () => {
        setStatValue(actor, Stat.RES, 10);
        expect(getResBonus(actor)).toBe(0);
      });

      it('should handle low RES values', () => {
        setStatValue(actor, Stat.RES, 8);
        expect(getResBonus(actor)).toBe(-1); // (8 - 10) / 2 = -1
      });

      it('should handle high RES values', () => {
        setStatValue(actor, Stat.RES, 20);
        expect(getResBonus(actor)).toBe(5); // (20 - 10) / 2 = 5
      });
    });

    describe('calculateMaxHpFromRes', () => {
      it('should calculate max HP from RES stat', () => {
        const expectedHp = BASE_HP + (2 * HP_PER_RES_BONUS); // 50 + (2 * 5) = 60
        expect(calculateMaxHpFromRes(actor)).toBe(expectedHp);
      });

      it('should handle baseline RES', () => {
        setStatValue(actor, Stat.RES, 10);
        expect(calculateMaxHpFromRes(actor)).toBe(BASE_HP); // 50 + (0 * 5) = 50
      });

      it('should handle negative RES bonus', () => {
        setStatValue(actor, Stat.RES, 8);
        const expectedHp = BASE_HP + (-1 * HP_PER_RES_BONUS); // 50 + (-1 * 5) = 45
        expect(calculateMaxHpFromRes(actor)).toBe(expectedHp);
      });
    });

    describe('updateMaxHpFromRes', () => {
      it('should update actor max HP based on RES', () => {
        updateMaxHpFromRes(actor);
        const expectedHp = BASE_HP + (2 * HP_PER_RES_BONUS); // 60
        expect(getMaxHp(actor)).toBe(expectedHp);
      });

      it('should preserve current HP if within new max', () => {
        setCurrentHp(actor, 55);
        updateMaxHpFromRes(actor);
        expect(getCurrentHp(actor)).toBe(55);
        expect(getMaxHp(actor)).toBe(60);
      });

      it('should reduce current HP if it exceeds new max', () => {
        setStatValue(actor, Stat.RES, 8); // Low RES = 45 max HP
        setCurrentHp(actor, 50);
        updateMaxHpFromRes(actor);
        expect(getCurrentHp(actor)).toBe(45);
        expect(getMaxHp(actor)).toBe(45);
      });
    });

    describe('initializeHpFromRes', () => {
      it('should set both max and current HP from RES', () => {
        initializeHpFromRes(actor);
        const expectedHp = BASE_HP + (2 * HP_PER_RES_BONUS); // 60
        expect(getMaxHp(actor)).toBe(expectedHp);
        expect(getCurrentHp(actor)).toBe(expectedHp);
      });

      it('should work with different RES values', () => {
        setStatValue(actor, Stat.RES, 16); // +3 bonus
        initializeHpFromRes(actor);
        const expectedHp = BASE_HP + (3 * HP_PER_RES_BONUS); // 65
        expect(getMaxHp(actor)).toBe(expectedHp);
        expect(getCurrentHp(actor)).toBe(expectedHp);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle combat damage scenario', () => {
      // Take damage
      decrementHp(actor, 30);
      expect(getCurrentHp(actor)).toBe(70);
      expect(isAlive(actor)).toBe(true);

      // Take more damage
      decrementHp(actor, 40);
      expect(getCurrentHp(actor)).toBe(30);
      expect(getHealthPercentage(actor)).toBe(0.3);

      // Heal partially
      incrementHp(actor, 20);
      expect(getCurrentHp(actor)).toBe(50);

      // Full heal
      restoreHpToMax(actor);
      expect(getCurrentHp(actor)).toBe(100);
      expect(isAlive(actor)).toBe(true);
    });

    it('should handle death scenario', () => {
      // Take lethal damage
      decrementHp(actor, 150);
      expect(getCurrentHp(actor)).toBe(0);
      expect(isDead(actor)).toBe(true);
      expect(isAlive(actor)).toBe(false);
      expect(getHealthPercentage(actor)).toBe(0);
    });

    it('should handle RES stat changes during gameplay', () => {
      // Initialize with RES-based HP
      setStatValue(actor, Stat.RES, 16); // +3 bonus
      initializeHpFromRes(actor);
      expect(getMaxHp(actor)).toBe(65);
      expect(getCurrentHp(actor)).toBe(65);

      // Take some damage
      decrementHp(actor, 20);
      expect(getCurrentHp(actor)).toBe(45);

      // RES gets buffed
      setStatValue(actor, Stat.RES, 20); // +5 bonus
      updateMaxHpFromRes(actor);
      expect(getMaxHp(actor)).toBe(75); // 50 + (5 * 5)
      expect(getCurrentHp(actor)).toBe(45); // Current HP preserved

      // RES gets debuffed below current HP
      setStatValue(actor, Stat.RES, 8); // -1 bonus
      updateMaxHpFromRes(actor);
      expect(getMaxHp(actor)).toBe(45); // 50 + (-1 * 5)
      expect(getCurrentHp(actor)).toBe(45); // Current HP clamped to new max
    });
  });

  describe('performance benchmarks', () => {
    it('should demonstrate consistent performance for health checks', () => {
      const iterations = 1000;

      const startTime = performance.now();

      // Repeated health status checks (should be consistently fast)
      for (let i = 0; i < iterations; i++) {
        isAlive(actor);
        isDead(actor);
        getHealthPercentage(actor);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTime = duration / (iterations * 3);

      console.log(`Pure function performance:`);
      console.log(`        - ${iterations * 3} operations: ${duration.toFixed(4)}ms`);
      console.log(`        - Average per operation: ${avgTime.toFixed(6)}ms`);

      // Pure functions should be very fast
      expect(duration).toBeLessThan(5);
      expect(avgTime).toBeLessThan(0.005); // Under 0.005ms per operation
    });

    it('should handle RES-based calculations efficiently', () => {
      const iterations = 1000;

      const startTime = performance.now();

      // Repeated RES-based HP calculations
      for (let i = 0; i < iterations; i++) {
        getResBonus(actor);
        calculateMaxHpFromRes(actor);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTime = duration / (iterations * 2);

      console.log(`RES calculation performance:`);
      console.log(`        - ${iterations * 2} calculations: ${duration.toFixed(4)}ms`);
      console.log(`        - Average per calculation: ${avgTime.toFixed(6)}ms`);

      // RES calculations should be fast
      expect(duration).toBeLessThan(10);
      expect(avgTime).toBeLessThan(0.01); // Under 0.01ms per calculation
    });
  });
});
