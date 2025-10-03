import { describe, it, expect, beforeEach } from 'vitest';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { Modifier } from '~/types/modifier';
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
  getEffectiveStatBonus,
  refreshStats,
  mutateNaturalStatValue,
  mutateStatModifiers,
  HasStats,
} from './stats';

// Test entity types
type TestStatName = 'strength' | 'dexterity' | 'intelligence';

interface TestEntity extends HasStats<Record<TestStatName, ModifiableScalarAttribute>> {
  id: string;
  name: string;
}

// Test fixtures
const createTestEntity = (overrides: Partial<TestEntity> = {}): TestEntity => ({
  id: 'test-entity',
  name: 'Test Entity',
  stats: {
    strength: createTestStat(),
    dexterity: createTestStat(),
    intelligence: createTestStat(),
  },
  ...overrides,
});

const createTestStat = (overrides: Partial<ModifiableScalarAttribute> = {}): ModifiableScalarAttribute => ({
  nat: 10,
  eff: 10,
  mods: {},
  ...overrides,
});

const createTestModifier = (overrides: Partial<Modifier> = {}): Modifier => ({
  schema: 'test-modifier' as any,
  position: 0.5,
  value: 5,
  ...overrides,
});

describe('Generic Stats System', () => {
  describe('Constants', () => {
    it('should have correct baseline and max values', () => {
      expect(BASELINE_STAT_VALUE).toBe(10);
      expect(MAX_STAT_VALUE).toBe(100);
      expect(NORMAL_STAT_RANGE).toBe(90);
    });
  });

  describe('calculateStatBonus', () => {
    it('should calculate Pathfinder 2E stat bonuses correctly', () => {
      expect(calculateStatBonus(10)).toBe(0); // Baseline
      expect(calculateStatBonus(12)).toBe(1); // +1 bonus
      expect(calculateStatBonus(14)).toBe(2); // +2 bonus
      expect(calculateStatBonus(8)).toBe(-1); // -1 penalty
      expect(calculateStatBonus(6)).toBe(-2); // -2 penalty
    });
  });

  describe('Basic Stat Access', () => {
    let entity: TestEntity;

    beforeEach(() => {
      entity = createTestEntity();
    });

    it('should get stat attribute', () => {
      const strengthStat = getStat(entity, 'strength');
      expect(strengthStat.nat).toBe(10);
      expect(strengthStat.eff).toBe(10);
      expect(strengthStat.mods).toEqual({});
    });

    it('should get effective stat value', () => {
      const strengthValue = getEffectiveStatValue(entity, 'strength');
      expect(strengthValue).toBe(10);
    });

    it('should get natural stat value', () => {
      const strengthValue = getNaturalStatValue(entity, 'strength');
      expect(strengthValue).toBe(10);
    });

    it('should throw when accessing non-existent stat', () => {
      delete (entity.stats as any).strength;
      expect(() => getStat(entity, 'strength')).toThrow('Entity does not have a stat strength');
    });
  });

  describe('Stat Modifiers', () => {
    let entity: TestEntity;

    beforeEach(() => {
      entity = createTestEntity();
    });

    it('should get empty modifiers by default', () => {
      const modifiers = getStatModifiers(entity, 'strength');
      expect(modifiers).toEqual({});
    });

    it('should get stat modifiers', () => {
      entity.stats.strength.mods = {
        'buff': createTestModifier({ value: 3 }),
        'equipment': createTestModifier({ value: 2 }),
      };

      const modifiers = getStatModifiers(entity, 'strength');
      expect(Object.keys(modifiers)).toHaveLength(2);
      expect(modifiers['buff'].value).toBe(3);
      expect(modifiers['equipment'].value).toBe(2);
    });

    it('should detect active modifiers', () => {
      entity.stats.strength.mods = {
        'active': createTestModifier({ position: 0.5 }),
        'expired': createTestModifier({ position: 1.0 }),
      };

      expect(hasGenericActiveStatModifiers(entity, 'strength')).toBe(true);
    });

    it('should detect no active modifiers when all expired', () => {
      entity.stats.strength.mods = {
        'expired1': createTestModifier({ position: 1.0 }),
        'expired2': createTestModifier({ position: 1.5 }),
      };

      expect(hasGenericActiveStatModifiers(entity, 'strength')).toBe(false);
    });

    it('should detect no active modifiers when none exist', () => {
      expect(hasGenericActiveStatModifiers(entity, 'strength')).toBe(false);
    });
  });

  describe('Effective Stat Computation', () => {
    let entity: TestEntity;

    beforeEach(() => {
      entity = createTestEntity();
    });

    it('should compute effective value without modifiers', () => {
      entity.stats.strength.nat = 15;
      const effectiveValue = computeEffectiveStatValue(entity, 'strength');
      expect(effectiveValue).toBe(15);
    });

    it('should compute effective value with active modifiers', () => {
      entity.stats.strength.nat = 12;
      entity.stats.strength.mods = {
        'buff': createTestModifier({ position: 0.3, value: 4 }),
        'equipment': createTestModifier({ position: 0.7, value: 2 }),
      };

      const effectiveValue = computeEffectiveStatValue(entity, 'strength');
      expect(effectiveValue).toBe(18); // 12 + 4 + 2
    });

    it('should ignore expired modifiers', () => {
      entity.stats.strength.nat = 12;
      entity.stats.strength.mods = {
        'active': createTestModifier({ position: 0.5, value: 3 }),
        'expired': createTestModifier({ position: 1.0, value: 100 }),
      };

      const effectiveValue = computeEffectiveStatValue(entity, 'strength');
      expect(effectiveValue).toBe(15); // 12 + 3 (expired ignored)
    });

    it('should clamp to minimum value', () => {
      entity.stats.strength.nat = 8;
      entity.stats.strength.mods = {
        'debuff': createTestModifier({ position: 0.5, value: -10 }),
      };

      const effectiveValue = computeEffectiveStatValue(entity, 'strength');
      expect(effectiveValue).toBe(BASELINE_STAT_VALUE); // Clamped to 10
    });

    it('should clamp to maximum value', () => {
      entity.stats.strength.nat = 95;
      entity.stats.strength.mods = {
        'buff': createTestModifier({ position: 0.5, value: 20 }),
      };

      const effectiveValue = computeEffectiveStatValue(entity, 'strength');
      expect(effectiveValue).toBe(MAX_STAT_VALUE); // Clamped to 100
    });
  });

  describe('Stat Bonus Calculation', () => {
    let entity: TestEntity;

    beforeEach(() => {
      entity = createTestEntity();
    });

    it('should calculate effective stat bonus', () => {
      entity.stats.strength.nat = 14;
      entity.stats.strength.mods = {
        'buff': createTestModifier({ position: 0.5, value: 2 }),
      };

      const bonus = getEffectiveStatBonus(entity, 'strength');
      expect(bonus).toBe(3); // (14 + 2 - 10) / 2 = 3
    });
  });

  describe('Stat Refresh', () => {
    let entity: TestEntity;

    beforeEach(() => {
      entity = createTestEntity();
    });

    it('should refresh all stats by default', () => {
      // Set up stale effective values
      entity.stats.strength.nat = 12;
      entity.stats.strength.eff = 0; // Stale
      entity.stats.strength.mods = {
        'buff': createTestModifier({ value: 3 }),
      };

      entity.stats.dexterity.nat = 14;
      entity.stats.dexterity.eff = 0; // Stale
      entity.stats.dexterity.mods = {
        'equipment': createTestModifier({ value: 2 }),
      };

      refreshStats(entity);

      expect(entity.stats.strength.eff).toBe(15); // 12 + 3
      expect(entity.stats.dexterity.eff).toBe(16); // 14 + 2
    });

    it('should refresh only specified stats', () => {
      entity.stats.strength.nat = 12;
      entity.stats.strength.eff = 0; // Stale
      entity.stats.strength.mods = {
        'buff': createTestModifier({ value: 3 }),
      };

      entity.stats.dexterity.nat = 14;
      entity.stats.dexterity.eff = 999; // Stale - should NOT be refreshed
      entity.stats.dexterity.mods = {
        'equipment': createTestModifier({ value: 2 }),
      };

      refreshStats(entity, ['strength']);

      expect(entity.stats.strength.eff).toBe(15); // Refreshed
      expect(entity.stats.dexterity.eff).toBe(999); // Unchanged
    });

    it('should handle expired modifiers correctly', () => {
      entity.stats.strength.nat = 15;
      entity.stats.strength.eff = 25; // Stale value that includes expired modifier
      entity.stats.strength.mods = {
        'active': createTestModifier({ position: 0.5, value: 3 }),
        'expired': createTestModifier({ position: 1.0, value: 100 }), // Expired
      };

      refreshStats(entity, ['strength']);

      const strengthStat = entity.stats.strength;
      expect(strengthStat.eff).toBe(18); // 15 + 3 (expired ignored)
      expect(Object.keys(strengthStat.mods!)).toHaveLength(2); // All modifiers preserved
    });
  });

  describe('Stat Mutations', () => {
    let entity: TestEntity;

    beforeEach(() => {
      entity = createTestEntity();
    });

    it('should mutate natural stat value', () => {
      mutateNaturalStatValue(entity, 'strength', 15);
      expect(entity.stats.strength.nat).toBe(15);
    });

    it('should mutate stat modifiers', () => {
      const newModifiers = {
        'test': createTestModifier({ value: 7 }),
      };

      mutateStatModifiers(entity, 'strength', newModifiers);
      expect(entity.stats.strength.mods).toBe(newModifiers);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistency between all stat functions', () => {
      const entity = createTestEntity();

      // Set up a stat with modifiers
      entity.stats.strength.nat = 15;
      entity.stats.strength.eff = 999; // Stale value
      entity.stats.strength.mods = {
        'active': createTestModifier({ position: 0.5, value: 4 }),
        'active2': createTestModifier({ position: 0.8, value: 2 }),
        'expired': createTestModifier({ position: 1.0, value: 100 }),
      };

      const naturalValue = getNaturalStatValue(entity, 'strength');
      const computedEffective = computeEffectiveStatValue(entity, 'strength');

      // Refresh to update cached effective value
      refreshStats(entity, ['strength']);
      const cachedEffective = getEffectiveStatValue(entity, 'strength');

      expect(naturalValue).toBe(15);
      expect(computedEffective).toBe(21); // 15 + 4 + 2
      expect(cachedEffective).toBe(21); // Should match computed after refresh
    });
  });
});
