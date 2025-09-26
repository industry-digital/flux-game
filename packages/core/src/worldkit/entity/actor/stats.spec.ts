import { describe, it, expect, beforeEach } from 'vitest';
import { Actor, ActorStat } from '~/types/entity/actor';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { Modifier } from '~/types/modifier';
import { createActor } from './index';
import {
  BASELINE_STAT_VALUE,
  MAX_STAT_VALUE,
  NORMAL_STAT_RANGE,
  calculateStatBonus,
  getActorStat,
  getActorStatModifiers,
  computeEffectiveStatValue,
  hasActiveStatModifiers,
  getStatModifierBonus,
  getEffectiveStatBonus,
  refreshActorStats,
  createActorStatApi,
  type ActorStatApi,
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

describe('stats.ts', () => {
  describe('Constants', () => {
    it('should have correct baseline and max values', () => {
      expect(BASELINE_STAT_VALUE).toBe(10);
      expect(MAX_STAT_VALUE).toBe(100);
      expect(NORMAL_STAT_RANGE).toBe(90);
    });
  });

  describe('calculateStatBonus', () => {
    it('should calculate Pathfinder 2E stat bonuses correctly', () => {
      expect(calculateStatBonus(8)).toBe(-1);   // (8-10)/2 = -1
      expect(calculateStatBonus(9)).toBe(-1);   // (9-10)/2 = -0.5 → -1
      expect(calculateStatBonus(10)).toBe(0);   // (10-10)/2 = 0
      expect(calculateStatBonus(11)).toBe(0);   // (11-10)/2 = 0.5 → 0
      expect(calculateStatBonus(12)).toBe(1);   // (12-10)/2 = 1
      expect(calculateStatBonus(13)).toBe(1);   // (13-10)/2 = 1.5 → 1
      expect(calculateStatBonus(14)).toBe(2);   // (14-10)/2 = 2
      expect(calculateStatBonus(20)).toBe(5);   // (20-10)/2 = 5
    });

    it('should handle extreme values', () => {
      expect(calculateStatBonus(1)).toBe(-5);   // (1-10)/2 = -4.5 → -5 (Math.floor)
      expect(calculateStatBonus(30)).toBe(10);  // Very high
    });
  });

  describe('getActorStat', () => {
    it('should return existing stat', () => {
      const testStat = createTestStat({ eff: 15 });
      const actor = createTestActor({ [ActorStat.POW]: testStat });
      const result = getActorStat(actor, ActorStat.POW);

      expect(result).toStrictEqual(testStat);
    });

    it('should throw error for non-existent stat', () => {
      // Create actor with empty stats using transform function
      const actor = createActor({
        name: 'Test Actor',
        description: 'Test actor for error handling',
        // @ts-expect-error
      }, (actor) => ({ ...actor, stats: {} })); // Remove all default stats

      expect(() => getActorStat(actor, ActorStat.POW)).toThrow(
        /Actor .* does not have a stat/
      );
    });
  });

  describe('getActorStatModifiers', () => {
    it('should return empty object for stat with no modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat(),
      });

      const result = getActorStatModifiers(actor, ActorStat.POW);

      expect(result).toEqual({});
    });

    it('should return object of modifiers for stat with modifiers', () => {
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

      const result = getActorStatModifiers(actor, ActorStat.POW);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['buff']).toStrictEqual(mod1);
      expect(result['debuff']).toStrictEqual(mod2);
    });

    it('should handle stat with undefined mods', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({ eff: 12 }),
      });

      const result = getActorStatModifiers(actor, ActorStat.POW);

      expect(result).toEqual({});
    });

    it('should return direct reference to mods object (zero-copy)', () => {
      const modsObject = { 'buff': createTestModifier({ value: 5 }) };
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: modsObject,
        }),
      });

      const result = getActorStatModifiers(actor, ActorStat.POW);

      // Should return the exact same object reference (zero-copy)
      expect(result).toBe(modsObject);
    });
  });

  describe('getEffectiveStatValue', () => {
    it('should return base value when no modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({ nat: 15, eff: 999 }), // eff is ignored, nat is used
      });

      const result = computeEffectiveStatValue(actor, ActorStat.POW);

      expect(result).toBe(15);
    });

    it('should add active modifier values to base value', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 12, // Use nat instead of eff
          eff: 999, // eff is ignored
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
          nat: 14, // Use nat instead of eff
          eff: 999, // eff is ignored
          mods: {
            'active': createTestModifier({ position: 0.5, value: 6 }),
            'expired': createTestModifier({ position: 1.0, value: 10 }),
          },
        }),
      });

      const result = computeEffectiveStatValue(actor, ActorStat.POW);

      expect(result).toBe(20); // 14 + 6 (expired ignored)
    });

    it('should handle negative modifier values', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 16, // Use nat instead of eff
          eff: 999, // eff is ignored
          mods: {
            'debuff': createTestModifier({ position: 0.4, value: -3 }),
          },
        }),
      });

      const result = computeEffectiveStatValue(actor, ActorStat.POW);

      expect(result).toBe(13); // 16 - 3
    });

    it('should clamp result to BASELINE_STAT_VALUE', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          eff: 12,
          mods: {
            'massive_debuff': createTestModifier({ position: 0.5, value: -20 }),
          },
        }),
      });

      const result = computeEffectiveStatValue(actor, ActorStat.POW);

      expect(result).toBe(BASELINE_STAT_VALUE); // Clamped to 10
    });

    it('should clamp result to MAX_STAT_VALUE', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 90, // Use nat instead of eff
          eff: 999, // eff is ignored
          mods: {
            'massive_buff': createTestModifier({ position: 0.5, value: 50 }),
          },
        }),
      });

      const result = computeEffectiveStatValue(actor, ActorStat.POW);

      expect(result).toBe(MAX_STAT_VALUE); // Clamped to 100
    });

    it('should work with pre-extracted baseStat and modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 16, // Use nat instead of eff
          eff: 999, // eff is ignored
          mods: {
            'buff': createTestModifier({ position: 0.3, value: 4 }),
          },
        }),
      });

      const baseStat = getActorStat(actor, ActorStat.POW);
      const modifiers = getActorStatModifiers(actor, ActorStat.POW);
      const result = computeEffectiveStatValue(actor, ActorStat.POW, baseStat, modifiers);

      expect(result).toBe(20); // 16 + 4
    });
  });

  describe('hasActiveStatModifiers', () => {
    it('should return false when no modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat(),
      });

      const result = hasActiveStatModifiers(actor, ActorStat.POW);

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

      const result = hasActiveStatModifiers(actor, ActorStat.POW);

      expect(result).toBe(true);
    });

    it('should return false when only expired modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'expired1': createTestModifier({ position: 1.0, value: 5 }),
            'expired2': createTestModifier({ position: 1.5, value: 3 }),
          },
        }),
      });

      const result = hasActiveStatModifiers(actor, ActorStat.POW);

      expect(result).toBe(false);
    });

    it('should return true when mix of active and expired modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'active': createTestModifier({ position: 0.8, value: 5 }),
            'expired': createTestModifier({ position: 1.0, value: 10 }),
          },
        }),
      });

      const result = hasActiveStatModifiers(actor, ActorStat.POW);

      expect(result).toBe(true);
    });
  });

  describe('getStatModifierBonus', () => {
    it('should return 0 when no modifiers exist', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat(),
      });

      const result = getStatModifierBonus(actor, ActorStat.POW);

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

      const result = getStatModifierBonus(actor, ActorStat.POW);

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

      const result = getStatModifierBonus(actor, ActorStat.POW);

      expect(result).toBe(8); // Only active modifier
    });

    it('should work with pre-extracted modifiers array', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'buff': createTestModifier({ position: 0.3, value: 7 }),
          },
        }),
      });

      const modifiers = getActorStatModifiers(actor, ActorStat.POW);
      const result = getStatModifierBonus(actor, ActorStat.POW, modifiers);

      expect(result).toBe(7);
    });

    it('should handle all expired modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'expired1': createTestModifier({ position: 1.0, value: 10 }),
            'expired2': createTestModifier({ position: 1.2, value: 5 }),
          },
        }),
      });

      const result = getStatModifierBonus(actor, ActorStat.POW);

      expect(result).toBe(0);
    });

    it('should handle edge case of position exactly 1.0', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          mods: {
            'edge_case': createTestModifier({ position: 1.0, value: 15 }),
          },
        }),
      });

      const result = getStatModifierBonus(actor, ActorStat.POW);

      expect(result).toBe(0); // position 1.0 is expired
    });
  });

  describe('getEffectiveStatBonus', () => {
    it('should calculate bonus from effective stat value', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 14, // Natural value: 14
          eff: 999, // eff is ignored
          mods: {
            'buff': createTestModifier({ position: 0.5, value: 4 }), // +4 → 18 total
          },
        }),
      });

      const result = getEffectiveStatBonus(actor, ActorStat.POW);

      expect(result).toBe(4); // (18-10)/2 = 4
    });

    it('should handle modifiers that change bonus tier', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 11, // Natural value: 11
          eff: 999, // eff is ignored
          mods: {
            'buff': createTestModifier({ position: 0.3, value: 1 }), // +1 → 12 total
          },
        }),
      });

      const result = getEffectiveStatBonus(actor, ActorStat.POW);

      expect(result).toBe(1); // (12-10)/2 = 1
    });

    it('should work with negative modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 16, // Natural value: 16
          eff: 999, // eff is ignored
          mods: {
            'debuff': createTestModifier({ position: 0.7, value: -4 }), // -4 → 12 total
          },
        }),
      });

      const result = getEffectiveStatBonus(actor, ActorStat.POW);

      expect(result).toBe(1); // (12-10)/2 = 1
    });
  });

  describe('integration tests', () => {
    it('should maintain consistency between getEffectiveStatValue and getStatModifierBonus', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 15, // Natural value: 15
          eff: 999, // eff is ignored
          mods: {
            'buff1': createTestModifier({ position: 0.2, value: 5 }),
            'buff2': createTestModifier({ position: 0.8, value: 3 }),
            'debuff': createTestModifier({ position: 0.5, value: -2 }),
            'expired': createTestModifier({ position: 1.0, value: 100 }),
          },
        }),
      });

      const effectiveValue = computeEffectiveStatValue(actor, ActorStat.POW);
      const modifierBonus = getStatModifierBonus(actor, ActorStat.POW);
      const baseStat = getActorStat(actor, ActorStat.POW);

      expect(effectiveValue).toBe(baseStat.nat + modifierBonus); // Use nat instead of eff
      expect(effectiveValue).toBe(21); // 15 + 5 + 3 - 2 = 21
      expect(modifierBonus).toBe(6); // 5 + 3 - 2 = 6
    });

    it('should handle complex modifier scenarios correctly', () => {
      const actor = createTestActor({
          [ActorStat.POW]: createTestStat({
          nat: 18, // Natural value: 18
          eff: 999, // eff is ignored
          mods: {
            'equipment': createTestModifier({ position: 0.1, value: 2 }),
            'spell': createTestModifier({ position: 0.6, value: 4 }),
            'curse': createTestModifier({ position: 0.3, value: -3 }),
            'expired_buff': createTestModifier({ position: 1.0, value: 10 }),
            'expired_debuff': createTestModifier({ position: 1.2, value: -5 }),
          },
        }),
      });

      const effectiveValue = computeEffectiveStatValue(actor, ActorStat.POW);
      const modifierBonus = getStatModifierBonus(actor, ActorStat.POW);
      const effectiveBonus = getEffectiveStatBonus(actor, ActorStat.POW);
      const hasActive = hasActiveStatModifiers(actor, ActorStat.POW);

      expect(modifierBonus).toBe(3); // 2 + 4 - 3 = 3 (expired ignored)
      expect(effectiveValue).toBe(21); // 18 + 3
      expect(effectiveBonus).toBe(5); // (21-10)/2 = 5
      expect(hasActive).toBe(true);
    });
  });

  describe('refreshActorStats', () => {
    it('should update all stat effective values and modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 14,
          eff: 12, // Stale value
          mods: {
            'buff': createTestModifier({ position: 0.3, value: 4 }),
            'debuff': createTestModifier({ position: 0.7, value: -2 }),
          },
        }),
        [ActorStat.FIN]: createTestStat({
          nat: 16,
          eff: 20, // Stale value
          mods: {
            'equipment': createTestModifier({ position: 0.5, value: 3 }),
          },
        }),
        [ActorStat.RES]: createTestStat({
          nat: 12,
          eff: 8, // Stale value
          mods: {},
        }),
      });

      refreshActorStats(actor);

      // Check POW stat was refreshed correctly
      const powStat = getActorStat(actor, ActorStat.POW);
      expect(powStat.nat).toBe(14); // Natural value unchanged
      expect(powStat.eff).toBe(16); // 14 + 4 - 2 = 16
      expect(powStat.mods).toBeDefined();
      expect(Object.keys(powStat.mods!)).toHaveLength(2);

      // Check FIN stat was refreshed correctly
      const finStat = getActorStat(actor, ActorStat.FIN);
      expect(finStat.nat).toBe(16); // Natural value unchanged
      expect(finStat.eff).toBe(19); // 16 + 3 = 19
      expect(finStat.mods).toBeDefined();
      expect(Object.keys(finStat.mods!)).toHaveLength(1);

      // Check RES stat was refreshed correctly
      const resStat = getActorStat(actor, ActorStat.RES);
      expect(resStat.nat).toBe(12); // Natural value unchanged
      expect(resStat.eff).toBe(12); // 12 + 0 = 12 (no modifiers)
      expect(resStat.mods).toBeDefined();
      expect(Object.keys(resStat.mods!)).toHaveLength(0);
    });

    it('should handle stats with expired modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 15,
          eff: 25, // Stale value that includes expired modifier
          mods: {
            'active': createTestModifier({ position: 0.4, value: 3 }),
            'expired': createTestModifier({ position: 1.0, value: 10 }),
            'very_expired': createTestModifier({ position: 1.5, value: 5 }),
          },
        }),
      });

      refreshActorStats(actor);

      const powStat = getActorStat(actor, ActorStat.POW);
      expect(powStat.nat).toBe(15); // Natural value unchanged
      expect(powStat.eff).toBe(18); // 15 + 3 = 18 (expired modifiers ignored)
      expect(Object.keys(powStat.mods!)).toHaveLength(3); // All modifiers preserved in mods
    });

    it('should handle stats with no modifiers', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 13,
          eff: 999, // Stale value
          mods: {},
        }),
        [ActorStat.FIN]: createTestStat({
          nat: 11,
          eff: -5, // Stale value
          mods: undefined, // No mods property
        }),
      });

      refreshActorStats(actor);

      const powStat = getActorStat(actor, ActorStat.POW);
      expect(powStat.nat).toBe(13);
      expect(powStat.eff).toBe(13); // Natural value only
      expect(powStat.mods).toEqual({});

      const finStat = getActorStat(actor, ActorStat.FIN);
      expect(finStat.nat).toBe(11);
      expect(finStat.eff).toBe(11); // Natural value only
      expect(finStat.mods).toEqual({});
    });

    it('should apply stat value clamping during refresh', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 5, // Below baseline
          eff: 5, // Stale value
          mods: {
            'small_buff': createTestModifier({ position: 0.5, value: 2 }),
          },
        }),
        [ActorStat.FIN]: createTestStat({
          nat: 95,
          eff: 95, // Stale value
          mods: {
            'massive_buff': createTestModifier({ position: 0.3, value: 20 }),
          },
        }),
      });

      refreshActorStats(actor);

      const powStat = getActorStat(actor, ActorStat.POW);
      expect(powStat.nat).toBe(5); // Natural value unchanged
      expect(powStat.eff).toBe(BASELINE_STAT_VALUE); // Clamped to minimum (10)

      const finStat = getActorStat(actor, ActorStat.FIN);
      expect(finStat.nat).toBe(95); // Natural value unchanged
      expect(finStat.eff).toBe(MAX_STAT_VALUE); // Clamped to maximum (100)
    });

    it('should refresh all six core stats', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({ nat: 12, eff: 0 }),
        [ActorStat.FIN]: createTestStat({ nat: 14, eff: 0 }),
        [ActorStat.RES]: createTestStat({ nat: 16, eff: 0 }),
        [ActorStat.INT]: createTestStat({ nat: 18, eff: 0 }),
        [ActorStat.PER]: createTestStat({ nat: 13, eff: 0 }),
        [ActorStat.MEM]: createTestStat({ nat: 15, eff: 0 }),
      });

      refreshActorStats(actor);

      // All stats should have their effective values updated
      expect(getActorStat(actor, ActorStat.POW).eff).toBe(12);
      expect(getActorStat(actor, ActorStat.FIN).eff).toBe(14);
      expect(getActorStat(actor, ActorStat.RES).eff).toBe(16);
      expect(getActorStat(actor, ActorStat.INT).eff).toBe(18);
      expect(getActorStat(actor, ActorStat.PER).eff).toBe(13);
      expect(getActorStat(actor, ActorStat.MEM).eff).toBe(15);
    });

    it('should preserve modifier references (zero-copy)', () => {
      const originalMods = {
        'test': createTestModifier({ position: 0.5, value: 5 }),
      };

      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 12,
          eff: 0,
          mods: originalMods,
        }),
      });

      refreshActorStats(actor);

      const powStat = getActorStat(actor, ActorStat.POW);
      expect(powStat.mods).toBe(originalMods); // Same reference (zero-copy)
      expect(powStat.eff).toBe(17); // 12 + 5
    });

    it('should handle complex modifier scenarios across multiple stats', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 16,
          eff: 999, // Stale
          mods: {
            'equipment': createTestModifier({ position: 0.2, value: 4 }),
            'spell': createTestModifier({ position: 0.6, value: -2 }),
            'expired': createTestModifier({ position: 1.0, value: 100 }),
          },
        }),
        [ActorStat.FIN]: createTestStat({
          nat: 14,
          eff: -999, // Stale
          mods: {
            'curse': createTestModifier({ position: 0.8, value: -5 }),
            'blessing': createTestModifier({ position: 0.1, value: 3 }),
          },
        }),
        [ActorStat.RES]: createTestStat({
          nat: 8, // Below baseline
          eff: 8, // Stale
          mods: {
            'minor_buff': createTestModifier({ position: 0.5, value: 1 }),
          },
        }),
      });

      refreshActorStats(actor);

      // POW: 16 + 4 - 2 = 18 (expired ignored)
      const powStat = getActorStat(actor, ActorStat.POW);
      expect(powStat.eff).toBe(18);
      expect(Object.keys(powStat.mods!)).toHaveLength(3); // All mods preserved

      // FIN: 14 - 5 + 3 = 12
      const finStat = getActorStat(actor, ActorStat.FIN);
      expect(finStat.eff).toBe(12);
      expect(Object.keys(finStat.mods!)).toHaveLength(2);

      // RES: 8 + 1 = 9, but clamped to baseline (10)
      const resStat = getActorStat(actor, ActorStat.RES);
      expect(resStat.eff).toBe(BASELINE_STAT_VALUE);
      expect(Object.keys(resStat.mods!)).toHaveLength(1);
    });

    it('should be idempotent when called multiple times', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 15,
          eff: 999, // Stale
          mods: {
            'buff': createTestModifier({ position: 0.4, value: 3 }),
          },
        }),
      });

      // First refresh
      refreshActorStats(actor);
      const firstResult = getActorStat(actor, ActorStat.POW).eff;
      expect(firstResult).toBe(18); // 15 + 3

      // Second refresh should produce same result
      refreshActorStats(actor);
      const secondResult = getActorStat(actor, ActorStat.POW).eff;
      expect(secondResult).toBe(18);
      expect(secondResult).toBe(firstResult);

      // Third refresh should still produce same result
      refreshActorStats(actor);
      const thirdResult = getActorStat(actor, ActorStat.POW).eff;
      expect(thirdResult).toBe(18);
      expect(thirdResult).toBe(firstResult);
    });

    it('should handle edge case of position exactly 1.0 (expired)', () => {
      const actor = createTestActor({
        [ActorStat.POW]: createTestStat({
          nat: 12,
          eff: 999, // Stale
          mods: {
            'edge_case': createTestModifier({ position: 1.0, value: 10 }),
            'active': createTestModifier({ position: 0.9999, value: 2 }),
          },
        }),
      });

      refreshActorStats(actor);

      const powStat = getActorStat(actor, ActorStat.POW);
      expect(powStat.eff).toBe(14); // 12 + 2 (position 1.0 is expired)
      expect(Object.keys(powStat.mods!)).toHaveLength(2); // Both mods preserved
    });
  });

  describe('createActorStatApi', () => {
    let actors: Record<string, Actor>;
    let api: ActorStatApi;

    beforeEach(() => {
      // Create test actors
      actors = {
        'flux:actor:alice': createTestActor({
          [ActorStat.POW]: createTestStat({
            nat: 16, // Natural value: 16
            eff: 999, // eff is ignored
            mods: {
              'equipment': createTestModifier({ position: 0.2, value: 4 }),
              'spell': createTestModifier({ position: 0.7, value: -2 }),
            },
          }),
        }),
        'flux:actor:bob': createTestActor({
            [ActorStat.POW]: createTestStat({ nat: 12, eff: 999 }), // Use nat
        }),
      };

      // Create API
      api = createActorStatApi();
    });

    describe('function signatures', () => {
      it('should have identical signatures to original functions', () => {
        const alice = actors['flux:actor:alice'];

        // These should all compile and work identically
        const stat1 = getActorStat(alice, ActorStat.POW);
        const stat2 = api.getActorStat(alice, ActorStat.POW);
        expect(stat2).toStrictEqual(stat1);

        const mods1 = getActorStatModifiers(alice, ActorStat.POW);
        const mods2 = api.getActorStatModifiers(alice, ActorStat.POW);
        expect(mods2).toStrictEqual(mods1);

        const value1 = computeEffectiveStatValue(alice, ActorStat.POW);
        const value2 = api.getEffectiveStatValue(alice, ActorStat.POW);
        expect(value2).toBe(value1);

        const hasActive1 = hasActiveStatModifiers(alice, ActorStat.POW);
        const hasActive2 = api.hasActiveStatModifiers(alice, ActorStat.POW);
        expect(hasActive2).toBe(hasActive1);

        const bonus1 = getStatModifierBonus(alice, ActorStat.POW);
        const bonus2 = api.getStatModifierBonus(alice, ActorStat.POW);
        expect(bonus2).toBe(bonus1);

        const effectiveBonus1 = getEffectiveStatBonus(alice, ActorStat.POW);
        const effectiveBonus2 = api.getEffectiveStatBonus(alice, ActorStat.POW);
        expect(effectiveBonus2).toBe(effectiveBonus1);
      });
    });

    describe('memoization behavior', () => {
      it('should cache modifier extraction results', () => {
        const alice = actors['flux:actor:alice'];

        // First call should extract modifiers
        const mods1 = api.getActorStatModifiers(alice, ActorStat.POW);
        expect(Object.keys(mods1)).toHaveLength(2);

        // Second call should use cached result
        const mods2 = api.getActorStatModifiers(alice, ActorStat.POW);
        expect(mods2).toBe(mods1); // Same reference (cached)
        expect(mods2).toStrictEqual(mods1); // Same content
      });

      it('should use memoized modifiers in dependent functions', () => {
        const alice = actors['flux:actor:alice'];

        // Call getActorStatModifiers first to populate cache
        const mods = api.getActorStatModifiers(alice, ActorStat.POW);
        expect(Object.keys(mods)).toHaveLength(2);

        // These calls should use the cached modifiers
        const value = api.getEffectiveStatValue(alice, ActorStat.POW);
        const hasActive = api.hasActiveStatModifiers(alice, ActorStat.POW);
        const bonus = api.getStatModifierBonus(alice, ActorStat.POW);
        const effectiveBonus = api.getEffectiveStatBonus(alice, ActorStat.POW);

        expect(value).toBe(18); // 16 + 4 - 2
        expect(hasActive).toBe(true);
        expect(bonus).toBe(2); // 4 - 2
        expect(effectiveBonus).toBe(4); // (18-10)/2 = 4
      });

      it('should cache results per actor-stat combination', () => {
        const alice = actors['flux:actor:alice'];
        const bob = actors['flux:actor:bob'];

        // Different actors should have separate cache entries
        const aliceMods = api.getActorStatModifiers(alice, ActorStat.POW);
        const bobMods = api.getActorStatModifiers(bob, ActorStat.POW);

        expect(Object.keys(aliceMods)).toHaveLength(2);
        expect(Object.keys(bobMods)).toHaveLength(0);
        expect(aliceMods).not.toBe(bobMods);
      });
    });

    describe('error handling', () => {
      it('should handle actors with minimal data gracefully', () => {
        // Create actor with empty stats using transform function
        const minimalActor = createActor({
          name: 'Minimal Actor',
          description: 'Actor with no stats',
          // @ts-expect-error
        }, (actor) => ({ ...actor, stats: {} }));

        expect(() => {
          api.getActorStat(minimalActor, ActorStat.POW);
        }).toThrow(); // Should throw for missing stat

        // But other functions should handle gracefully when stat exists
        const actorWithStat = createTestActor({
          [ActorStat.POW]: createTestStat(),
        });

        expect(() => {
          api.getActorStatModifiers(actorWithStat, ActorStat.POW);
        }).not.toThrow();

        const mods = api.getActorStatModifiers(actorWithStat, ActorStat.POW);
        expect(Object.keys(mods)).toHaveLength(0);
      });
    });

    describe('performance characteristics', () => {
      it('should demonstrate caching benefits', () => {
        const alice = actors['flux:actor:alice'];

        // Multiple calls to functions that use modifiers
        for (let i = 0; i < 5; i++) {
          api.getEffectiveStatValue(alice, ActorStat.POW);
          api.hasActiveStatModifiers(alice, ActorStat.POW);
          api.getStatModifierBonus(alice, ActorStat.POW);
          api.getEffectiveStatBonus(alice, ActorStat.POW);
        }

        // Modifier extraction should only happen once per actor-stat combo
        const mods1 = api.getActorStatModifiers(alice, ActorStat.POW);
        const mods2 = api.getActorStatModifiers(alice, ActorStat.POW);
        expect(mods1).toBe(mods2); // Same reference = cached
      });
    });

    describe('edge cases', () => {
      it('should handle actors with no modifiers', () => {
        const bob = actors['flux:actor:bob'];

        const mods = api.getActorStatModifiers(bob, ActorStat.POW);
        const value = api.getEffectiveStatValue(bob, ActorStat.POW);
        const hasActive = api.hasActiveStatModifiers(bob, ActorStat.POW);
        const bonus = api.getStatModifierBonus(bob, ActorStat.POW);
        const effectiveBonus = api.getEffectiveStatBonus(bob, ActorStat.POW);

        expect(Object.keys(mods)).toHaveLength(0);
        expect(value).toBe(12); // Base value only
        expect(hasActive).toBe(false);
        expect(bonus).toBe(0);
        expect(effectiveBonus).toBe(1); // (12-10)/2 = 1
      });

      it('should handle expired modifiers correctly', () => {
        const actorWithExpired = createTestActor({
          [ActorStat.POW]: createTestStat({
            nat: 14, // Natural value: 14
            eff: 999, // eff is ignored
            mods: {
              'active': createTestModifier({ position: 0.5, value: 6 }),
              'expired': createTestModifier({ position: 1.0, value: 20 }), // Expired
            },
          }),
        });

        const mods = api.getActorStatModifiers(actorWithExpired, ActorStat.POW);
        const value = api.getEffectiveStatValue(actorWithExpired, ActorStat.POW);
        const hasActive = api.hasActiveStatModifiers(actorWithExpired, ActorStat.POW);
        const bonus = api.getStatModifierBonus(actorWithExpired, ActorStat.POW);
        const effectiveBonus = api.getEffectiveStatBonus(actorWithExpired, ActorStat.POW);

        expect(Object.keys(mods)).toHaveLength(2); // Both modifiers present
        expect(value).toBe(20); // 14 + 6 (expired ignored)
        expect(hasActive).toBe(true); // Active modifier present
        expect(bonus).toBe(6); // Only active modifier
        expect(effectiveBonus).toBe(5); // (20-10)/2 = 5
      });
    });
  });

  describe('performance benchmarks', () => {
    const BENCHMARK_ITERATIONS = 100000;
    const WARMUP_ITERATIONS = 1000;

    // Create test actors with different modifier loads
    const createBenchmarkActor = (modifierCount: number): Actor => {
      const mods: Record<string, Modifier> = {};
      for (let i = 0; i < modifierCount; i++) {
        const position = i < modifierCount * 0.7 ? Math.random() * 0.9 : 1.0 + Math.random();
        const value = (Math.random() - 0.5) * 10;
        mods[`mod-${i}`] = createTestModifier({ position, value });
      }

      return createTestActor({
        [ActorStat.POW]: createTestStat({
          eff: 16,
          mods,
        }),
      });
    };

    // Simulate old array-based approach for comparison
    const getActorStatModifiersArray = (actor: Actor, stat: ActorStat): Modifier[] => {
      const statState = actor.stats[stat];
      if (!statState?.mods) {
        return [];
      }

      const keys = Object.keys(statState.mods);
      const out = Array(keys.length);
      for (let i = 0; i < keys.length; i++) {
        out[i] = statState.mods[keys[i]];
      }
      return out;
    };

    const benchmarkFunction = (name: string, fn: () => void): void => {
      // Warmup
      for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        fn();
      }

      // Benchmark
      const start = performance.now();
      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        fn();
      }
      const end = performance.now();
      const duration = end - start;
      const opsPerSecond = Math.round(BENCHMARK_ITERATIONS / (duration / 1000));

      console.log(`${name}: ${duration.toFixed(2)}ms (${opsPerSecond.toLocaleString()} ops/sec)`);
    };

    it('should benchmark zero-copy vs array conversion performance', () => {
      const fewModsActor = createBenchmarkActor(3);
      const manyModsActor = createBenchmarkActor(20);

      console.log('\n=== Stat Modifier Extraction Benchmarks ===');

      // Few modifiers comparison
      console.log('\nFew Modifiers (3):');
      benchmarkFunction('  Zero-copy (AppliedModifiers)', () => {
        getActorStatModifiers(fewModsActor, ActorStat.POW);
      });

      benchmarkFunction('  Array conversion (old)', () => {
        getActorStatModifiersArray(fewModsActor, ActorStat.POW);
      });

      // Many modifiers comparison
      console.log('\nMany Modifiers (20):');
      benchmarkFunction('  Zero-copy (AppliedModifiers)', () => {
        getActorStatModifiers(manyModsActor, ActorStat.POW);
      });

      benchmarkFunction('  Array conversion (old)', () => {
        getActorStatModifiersArray(manyModsActor, ActorStat.POW);
      });

      expect(true).toBe(true);
    });

    it('should benchmark iteration patterns', () => {
      const actor = createBenchmarkActor(15);
      const modifiers = getActorStatModifiers(actor, ActorStat.POW);

      console.log('\n=== Stat Iteration Pattern Benchmarks ===');

      // for...in iteration (current)
      benchmarkFunction('for...in iteration', () => {
        let total = 0;
        for (let modifierId in modifiers) {
          const modifier = modifiers[modifierId];
          if (modifier.position < 1.0) {
            total += modifier.value;
          }
        }
      });

      // Object.values iteration (alternative)
      benchmarkFunction('Object.values iteration', () => {
        let total = 0;
        const values = Object.values(modifiers);
        for (const modifier of values) {
          if (modifier.position < 1.0) {
            total += modifier.value;
          }
        }
      });

      expect(true).toBe(true);
    });

    it('should benchmark memoized API performance', () => {
      const actor = createBenchmarkActor(10);
      const api = createActorStatApi();

      console.log('\n=== Memoized Stat API Benchmarks ===');

      // Cold cache (first call)
      benchmarkFunction('Cold cache (first call)', () => {
        api.getActorStatModifiers(actor, ActorStat.POW);
      });

      // Warm cache (subsequent calls)
      benchmarkFunction('Warm cache (cached)', () => {
        api.getActorStatModifiers(actor, ActorStat.POW);
      });

      expect(true).toBe(true);
    });

    it('should benchmark stat bonus calculation pipeline', () => {
      const actor = createBenchmarkActor(8);

      console.log('\n=== Stat Bonus Calculation Pipeline ===');

      // Individual function calls
      benchmarkFunction('getEffectiveStatValue', () => {
        computeEffectiveStatValue(actor, ActorStat.POW);
      });

      benchmarkFunction('getEffectiveStatBonus', () => {
        getEffectiveStatBonus(actor, ActorStat.POW);
      });

      // Memoized API calls
      const api = createActorStatApi();
      benchmarkFunction('API getEffectiveStatValue', () => {
        api.getEffectiveStatValue(actor, ActorStat.POW);
      });

      benchmarkFunction('API getEffectiveStatBonus', () => {
        api.getEffectiveStatBonus(actor, ActorStat.POW);
      });

      expect(true).toBe(true);
    });
  });
});
