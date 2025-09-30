import { describe, it, expect } from 'vitest';
import { Actor, ActorStat } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { Modifier } from '~/types/modifier';
import { createActor } from './index';
import { createShell } from '../shell/index';
import {
  BASELINE_STAT_VALUE,
  MAX_STAT_VALUE,
  NORMAL_STAT_RANGE,
  calculateStatBonus,
  getStat,
  getEffectiveStatValue,
  getNaturalStatValue,
  getStatModifiers,
  computeEffectiveStatValue,
  hasGenericActiveStatModifiers,
  getGenericStatModifierBonus,
  getEffectiveStatBonus,
  refreshStats,
  ALL_STAT_NAMES,
  SHELL_STAT_NAMES,
} from './stats';

// Test fixtures
const createTestActor = (stats: Partial<Record<ActorStat, ModifiableScalarAttribute>> = {}): Actor => {
  return createActor({
    name: 'Test Actor',
    description: 'Test actor for stat tests',
  }, (actor) => ({
    ...actor,
    stats: {
      ...actor.stats,
      ...stats,
    },
  }));
};

const createTestShell = (stats: Partial<Record<ActorStat, ModifiableScalarAttribute>> = {}): Shell => {
  return createShell({
    name: 'Test Shell',
  }, (shell) => ({
    ...shell,
    stats: {
      ...shell.stats,
      ...stats,
    },
  }));
};

const createTestModifier = (overrides: Partial<Modifier> = {}): Modifier => ({
  schema: 'test-modifier' as any,
  position: 0.5,
  value: 10,
  appliedBy: 'test-source' as any,
  ...overrides,
});

const createTestStat = (overrides: Partial<ModifiableScalarAttribute> = {}): ModifiableScalarAttribute => ({
  nat: BASELINE_STAT_VALUE,
  eff: BASELINE_STAT_VALUE,
  mods: {},
  ...overrides,
});

describe('Stats', () => {
  describe('Constants', () => {
    it('should have correct baseline and max values', () => {
      expect(BASELINE_STAT_VALUE).toBe(10);
      expect(MAX_STAT_VALUE).toBe(100);
      expect(NORMAL_STAT_RANGE).toBe(90);
    });

    it('should have correct stat name arrays', () => {
      expect(ALL_STAT_NAMES).toEqual([
        ActorStat.POW, ActorStat.FIN, ActorStat.RES,
        ActorStat.INT, ActorStat.PER, ActorStat.MEM
      ]);
      expect(SHELL_STAT_NAMES).toEqual([ActorStat.POW, ActorStat.FIN, ActorStat.RES]);
    });
  });

  describe('calculateStatBonus', () => {
    it('should calculate Pathfinder 2E stat bonuses correctly', () => {
      expect(calculateStatBonus(8)).toBe(-1);   // (8-10)/2 = -1
      expect(calculateStatBonus(9)).toBe(-1);   // (9-10)/2 = -0.5 → -1
      expect(calculateStatBonus(10)).toBe(0);   // (10-10)/2 = 0
      expect(calculateStatBonus(11)).toBe(0);   // (11-10)/2 = 0.5 → 0
      expect(calculateStatBonus(12)).toBe(1);   // (12-10)/2 = 1
      expect(calculateStatBonus(20)).toBe(5);   // (20-10)/2 = 5
    });
  });

  describe('getStat', () => {
    it('should work with Actor entities', () => {
      const testStat = createTestStat({ eff: 15 });
      const actor = createTestActor({ [ActorStat.POW]: testStat });

      const result = getStat(actor, ActorStat.POW);
      expect(result).toStrictEqual(testStat);
    });

    it('should work with Shell entities', () => {
      const testStat = createTestStat({ eff: 12 });
      const shell = createTestShell({ [ActorStat.FIN]: testStat });

      const result = getStat(shell, ActorStat.FIN);
      expect(result).toStrictEqual(testStat);
    });

    it('should throw error for non-existent stat', () => {
      const actor = createActor({
        name: 'Test Actor',
        description: 'Test actor for error handling',
        // @ts-expect-error - intentionally creating invalid state
      }, (actor) => ({ ...actor, stats: {} }));

      expect(() => getStat(actor, ActorStat.POW)).toThrow(
        /Entity .* does not have a stat/
      );
    });
  });

  describe('getEffectiveStatValue', () => {
    it('should return the cached effective value from stat.eff', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({ nat: 12, eff: 18 }),
      });

      const result = getEffectiveStatValue(actor, ActorStat.POW);
      expect(result).toBe(18); // Returns eff, not nat
    });

    it('should work with Shell entities', () => {
      const shell = createTestShell({
        [ActorStat.RES]: createTestStat({ nat: 14, eff: 16 }),
      });

      const result = getEffectiveStatValue(shell, ActorStat.RES);
      expect(result).toBe(16);
    });
  });

  describe('getNaturalStatValue', () => {
    it('should return the natural stat value', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({ nat: 15, eff: 20 }),
      });

      const result = getNaturalStatValue(actor, ActorStat.POW);
      expect(result).toBe(15); // Returns nat, not eff
    });

    it('should work with Shell entities', () => {
      const shell = createTestShell({
        [ActorStat.FIN]: createTestStat({ nat: 13, eff: 18 }),
      });

      const result = getNaturalStatValue(shell, ActorStat.FIN);
      expect(result).toBe(13);
    });
  });

  describe('getStatModifiers', () => {
    it('should return empty object for stat with no modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat(),
      });

      const result = getStatModifiers(actor, ActorStat.POW);
      expect(result).toEqual({});
    });

    it('should return modifiers object', () => {
      const mod1 = createTestModifier({ value: 5 });
      const mod2 = createTestModifier({ value: -2 });
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'buff': mod1,
            'debuff': mod2,
          },
        }),
      });

      const result = getStatModifiers(actor, ActorStat.POW);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['buff']).toStrictEqual(mod1);
      expect(result['debuff']).toStrictEqual(mod2);
    });

    it('should work with Shell entities', () => {
      const mod = createTestModifier({ value: 3 });
      const shell = createTestShell({
        [ActorStat.RES]: createTestStat({
          mods: { 'equipment': mod },
        }),
      });

      const result = getStatModifiers(shell, ActorStat.RES);
      expect(result['equipment']).toStrictEqual(mod);
    });
  });

  describe('computeEffectiveStatValue', () => {
    it('should return base value when no modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({ nat: 15 }),
      });

      const result = computeEffectiveStatValue(actor, ActorStat.POW);
      expect(result).toBe(15);
    });

    it('should add active modifier values to base value', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 12,
          mods: {
            'buff1': createTestModifier({ position: 0.3, value: 4 }),
            'buff2': createTestModifier({ position: 0.7, value: 2 }),
          },
        }),
      });

      const result = computeEffectiveStatValue(actor, ActorStat.POW);
      expect(result).toBe(18); // 12 + 4 + 2
    });

    it('should ignore expired modifiers (position >= 1.0)', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 14,
          mods: {
            'active': createTestModifier({ position: 0.5, value: 6 }),
            'expired': createTestModifier({ position: 1.0, value: 10 }),
          },
        }),
      });

      const result = computeEffectiveStatValue(actor, ActorStat.POW);
      expect(result).toBe(20); // 14 + 6 (expired ignored)
    });

    it('should clamp result to valid stat range', () => {
      const lowActor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 5,
          mods: {
            'debuff': createTestModifier({ position: 0.5, value: -10 }),
          },
        }),
      });

      const highActor = createTestActor({
        [ActorStat.FIN]: createTestStat({
          nat: 90,
          mods: {
            'buff': createTestModifier({ position: 0.5, value: 50 }),
          },
        }),
      });

      expect(computeEffectiveStatValue(lowActor, ActorStat.POW)).toBe(BASELINE_STAT_VALUE);
      expect(computeEffectiveStatValue(highActor, ActorStat.FIN)).toBe(MAX_STAT_VALUE);
    });

    it('should work with Shell entities', () => {
      const shell = createTestShell({
        [ActorStat.POW]: createTestStat({
          nat: 16,
          mods: {
            'enhancement': createTestModifier({ position: 0.4, value: 3 }),
          },
        }),
      });

      const result = computeEffectiveStatValue(shell, ActorStat.POW);
      expect(result).toBe(19); // 16 + 3
    });
  });

  describe('hasGenericActiveStatModifiers', () => {
    it('should return false when no modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat(),
      });

      const result = hasGenericActiveStatModifiers(actor, ActorStat.POW);
      expect(result).toBe(false);
    });

    it('should return true when active modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'active': createTestModifier({ position: 0.5, value: 5 }),
          },
        }),
      });

      const result = hasGenericActiveStatModifiers(actor, ActorStat.POW);
      expect(result).toBe(true);
    });

    it('should return false when only expired modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'expired': createTestModifier({ position: 1.0, value: 5 }),
          },
        }),
      });

      const result = hasGenericActiveStatModifiers(actor, ActorStat.POW);
      expect(result).toBe(false);
    });

    it('should work with Shell entities', () => {
      const shell = createTestShell({
        [ActorStat.FIN]: createTestStat({
          mods: {
            'active': createTestModifier({ position: 0.8, value: 2 }),
          },
        }),
      });

      const result = hasGenericActiveStatModifiers(shell, ActorStat.FIN);
      expect(result).toBe(true);
    });
  });

  describe('getGenericStatModifierBonus', () => {
    it('should return 0 when no modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat(),
      });

      const result = getGenericStatModifierBonus(actor, ActorStat.POW);
      expect(result).toBe(0);
    });

    it('should sum active modifier values', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'buff1': createTestModifier({ position: 0.2, value: 5 }),
            'buff2': createTestModifier({ position: 0.6, value: 3 }),
            'debuff': createTestModifier({ position: 0.4, value: -2 }),
          },
        }),
      });

      const result = getGenericStatModifierBonus(actor, ActorStat.POW);
      expect(result).toBe(6); // 5 + 3 - 2
    });

    it('should ignore expired modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'active': createTestModifier({ position: 0.5, value: 8 }),
            'expired': createTestModifier({ position: 1.0, value: 20 }),
          },
        }),
      });

      const result = getGenericStatModifierBonus(actor, ActorStat.POW);
      expect(result).toBe(8); // Only active modifier
    });

    it('should work with Shell entities', () => {
      const shell = createTestShell({
        [ActorStat.RES]: createTestStat({
          mods: {
            'armor': createTestModifier({ position: 0.3, value: 4 }),
            'curse': createTestModifier({ position: 0.7, value: -1 }),
          },
        }),
      });

      const result = getGenericStatModifierBonus(shell, ActorStat.RES);
      expect(result).toBe(3); // 4 - 1
    });
  });

  describe('getEffectiveStatBonus', () => {
    it('should calculate bonus from effective stat value', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 14,
          mods: {
            'buff': createTestModifier({ position: 0.5, value: 4 }), // +4 → 18 total
          },
        }),
      });

      const result = getEffectiveStatBonus(actor, ActorStat.POW);
      expect(result).toBe(4); // (18-10)/2 = 4
    });

    it('should work with Shell entities', () => {
      const shell = createTestShell({
        [ActorStat.FIN]: createTestStat({
          nat: 16,
          mods: {
            'enhancement': createTestModifier({ position: 0.3, value: 2 }), // +2 → 18 total
          },
        }),
      });

      const result = getEffectiveStatBonus(shell, ActorStat.FIN);
      expect(result).toBe(4); // (18-10)/2 = 4
    });
  });

  describe('refreshStats', () => {
    it('should refresh all stats when no statNames provided', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 14,
          eff: 0, // Stale value
          mods: {
            'buff': createTestModifier({ position: 0.3, value: 4 }),
          },
        }),
        [ActorStat.FIN]: createTestStat({
          nat: 16,
          eff: 0, // Stale value
          mods: {
            'equipment': createTestModifier({ position: 0.5, value: 2 }),
          },
        }),
      });

      refreshStats(actor);

      expect(getStat(actor, ActorStat.POW).eff).toBe(18); // 14 + 4
      expect(getStat(actor, ActorStat.FIN).eff).toBe(18); // 16 + 2
    });

    it('should refresh only specified stats', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 12,
          eff: 0, // Stale value
          mods: {
            'buff': createTestModifier({ position: 0.5, value: 3 }),
          },
        }),
        [ActorStat.FIN]: createTestStat({
          nat: 14,
          eff: 999, // Stale value - should NOT be refreshed
        }),
      });

      refreshStats(actor, [ActorStat.POW]);

      expect(getStat(actor, ActorStat.POW).eff).toBe(15); // 12 + 3 (refreshed)
      expect(getStat(actor, ActorStat.FIN).eff).toBe(999); // Unchanged (not refreshed)
    });

    it('should work with Shell entities', () => {
      const shell = createTestShell({
        [ActorStat.POW]: createTestStat({
          nat: 15,
          eff: 0, // Stale value
          mods: {
            'enhancement': createTestModifier({ position: 0.4, value: 2 }),
          },
        }),
        [ActorStat.FIN]: createTestStat({
          nat: 13,
          eff: 0, // Stale value
        }),
        [ActorStat.RES]: createTestStat({
          nat: 11,
          eff: 0, // Stale value
          mods: {
            'armor': createTestModifier({ position: 0.6, value: 4 }),
          },
        }),
      });

      refreshStats(shell, SHELL_STAT_NAMES);

      expect(getStat(shell, ActorStat.POW).eff).toBe(17); // 15 + 2
      expect(getStat(shell, ActorStat.FIN).eff).toBe(13); // 13 + 0
      expect(getStat(shell, ActorStat.RES).eff).toBe(15); // 11 + 4
    });

    it('should handle expired modifiers correctly', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 15,
          eff: 25, // Stale value that includes expired modifier
          mods: {
            'active': createTestModifier({ position: 0.4, value: 3 }),
            'expired': createTestModifier({ position: 1.0, value: 10 }),
          },
        }),
      });

      refreshStats(actor, [ActorStat.POW]);

      const powStat = getStat(actor, ActorStat.POW);
      expect(powStat.eff).toBe(18); // 15 + 3 (expired ignored)
      expect(Object.keys(powStat.mods!)).toHaveLength(2); // All modifiers preserved
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistency between all stat functions', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 15,
          eff: 999, // Stale value
          mods: {
            'buff1': createTestModifier({ position: 0.2, value: 5 }),
            'buff2': createTestModifier({ position: 0.8, value: 3 }),
            'debuff': createTestModifier({ position: 0.5, value: -2 }),
            'expired': createTestModifier({ position: 1.0, value: 100 }),
          },
        }),
      });

      const naturalValue = getNaturalStatValue(actor, ActorStat.POW);
      const modifierBonus = getGenericStatModifierBonus(actor, ActorStat.POW);
      const computedEffective = computeEffectiveStatValue(actor, ActorStat.POW);
      const hasActive = hasGenericActiveStatModifiers(actor, ActorStat.POW);

      // Refresh to update cached effective value
      refreshStats(actor, [ActorStat.POW]);
      const cachedEffective = getEffectiveStatValue(actor, ActorStat.POW);
      const effectiveBonus = getEffectiveStatBonus(actor, ActorStat.POW);

      expect(naturalValue).toBe(15);
      expect(modifierBonus).toBe(6); // 5 + 3 - 2 = 6 (expired ignored)
      expect(computedEffective).toBe(21); // 15 + 6
      expect(cachedEffective).toBe(21); // Should match computed after refresh
      expect(effectiveBonus).toBe(5); // (21-10)/2 = 5
      expect(hasActive).toBe(true);
    });

    it('should work consistently across Actor and Shell entities', () => {
      const modifiers = {
        'equipment': createTestModifier({ position: 0.3, value: 4 }),
        'spell': createTestModifier({ position: 0.7, value: -1 }),
      };

      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({ nat: 16, mods: modifiers }),
      });

      const shell = createTestShell({
        [ActorStat.POW]: createTestStat({ nat: 16, mods: modifiers }),
      });

      // Both should produce identical results
      expect(getNaturalStatValue(actor, ActorStat.POW)).toBe(getNaturalStatValue(shell, ActorStat.POW));
      expect(computeEffectiveStatValue(actor, ActorStat.POW)).toBe(computeEffectiveStatValue(shell, ActorStat.POW));
      expect(getGenericStatModifierBonus(actor, ActorStat.POW)).toBe(getGenericStatModifierBonus(shell, ActorStat.POW));
      expect(getEffectiveStatBonus(actor, ActorStat.POW)).toBe(getEffectiveStatBonus(shell, ActorStat.POW));
      expect(hasGenericActiveStatModifiers(actor, ActorStat.POW)).toBe(hasGenericActiveStatModifiers(shell, ActorStat.POW));
    });
  });
});
