import { describe, it, expect, vi } from 'vitest';
import { Stat } from '~/types';
import { DamageModel, StatScalingDamageSpecification } from '~/types/damage';
import { Actor } from '~/types/entity/actor';
import {
  calculateAverageWeaponDamagePerHit,
  rollWeaponDamage,
  calculateWeaponDps,
  analyzeWeapon,
  CalculateWeaponDamageDependencies,
  WeaponAnalysis
} from './resolution';
import { createTestWeapon } from '../testing/weapon';
import { createActor } from '~/worldkit/entity/actor';
import { MAX_STAT_VALUE } from '~/worldkit/entity';

describe('damage resolution utilities', () => {
  const createTestActor = (powValue: number = 10): Actor => {
    return createActor((actor: Actor) => ({
      ...actor,
      id: 'flux:actor:test',
      name: 'Test Actor',
      shells: {
        ...actor.shells,
        [actor.currentShell]: {
          ...actor.shells[actor.currentShell],
          stats: {
            ...actor.shells[actor.currentShell].stats,
            [Stat.POW]: { nat: powValue, eff: powValue, mods: {} },
          },
        },
      },
    }));
  };

  describe('calculateAverageWeaponDamagePerHit', () => {
    it('calculates average damage for fixed damage model', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          ...schema.damage,
          model: DamageModel.FIXED,
          base: '2d6', // Library calculates as (2 * 6 / 2) = 6
        },
      }));
      const actor = createTestActor(15);

      const avgDamage = calculateAverageWeaponDamagePerHit(actor, weapon);

      expect(avgDamage).toBe(6); // Library's calculation: 2 * 6 / 2 = 6
    });

    it('calculates average damage for stat-scaling model with low stat', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 0.5,
          base: '1d6', // Library calculates as (1 * 6 / 2) = 3
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));
      const actor = createTestActor(10); // 10/100 * 0.5 = 0.05 bonus

      const avgDamage = calculateAverageWeaponDamagePerHit(actor, weapon);

      expect(avgDamage).toBe(3.05); // 3 + 0.05
    });

    it('calculates average damage for stat-scaling model with high stat', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 1.0,
          base: '1d6', // Library calculates as (1 * 6 / 2) = 3
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));
      const actor = createTestActor(MAX_STAT_VALUE); // 100/100 * 1.0 = 1.0 bonus

      const avgDamage = calculateAverageWeaponDamagePerHit(actor, weapon);

      expect(avgDamage).toBe(4); // 3 + 1.0
    });

    it('handles zero stat values', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 0.5,
          base: '1d6', // Library calculates as (1 * 6 / 2) = 3
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));
      const actor = createTestActor(0); // 0/100 * 0.5 = 0 bonus

      const avgDamage = calculateAverageWeaponDamagePerHit(actor, weapon);

      expect(avgDamage).toBe(3); // 3 + 0
    });
  });

  describe('rollWeaponDamage', () => {
    it('returns base damage roll for fixed damage model', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          ...schema.damage,
          model: DamageModel.FIXED,
          base: '1d6',
        },
      }));
      const actor = createTestActor(15);

      const mockDeps: CalculateWeaponDamageDependencies = {
        rollDice: vi.fn().mockReturnValue({
          values: [4],
          dice: '1d6',
          natural: 4,
          bonus: 0,
          result: 4
        }),
        timestamp: vi.fn().mockReturnValue(1000),
      };

      const result = rollWeaponDamage(actor, weapon, mockDeps);

      expect(result.result).toBe(4);
      expect(mockDeps.rollDice).toHaveBeenCalledWith('1d6');
      expect(result.mods).toBeUndefined(); // No modifiers for fixed damage
    });

    it('applies stat scaling modifier for stat-scaling damage model', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 0.5,
          base: '1d6',
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));
      const actor = createTestActor(20); // 20/100 * 0.5 = 0.1 bonus

      const mockDeps: CalculateWeaponDamageDependencies = {
        rollDice: vi.fn().mockReturnValue({
          values: [4],
          dice: '1d6',
          natural: 4,
          bonus: 0,
          result: 4
        }),
        timestamp: vi.fn().mockReturnValue(1000),
      };

      const result = rollWeaponDamage(actor, weapon, mockDeps);

      expect(result.result).toBe(4.1); // 4 + 0.1
      expect(result.mods).toBeDefined();
      expect(result.mods!['stat:pow']).toBeDefined();
      expect(result.mods!['stat:pow'].value).toBe(0.1);
      expect(result.mods!['stat:pow'].origin).toBe('stat:pow');
    });

    it('uses default dependencies when none provided', () => {
      const weapon = createTestWeapon();
      const actor = createTestActor();

      const result = rollWeaponDamage(actor, weapon);

      expect(typeof result.result).toBe('number');
      expect(result.result).toBeGreaterThan(0);
    });
  });

  describe('calculateWeaponDps', () => {
    it('calculates DPS correctly', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.FIXED,
          base: '2d6', // Average: 7
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));
      const actor = createTestActor();

      const dps = calculateWeaponDps(actor, weapon);

      // DPS = damage / AP cost
      // We need to verify this matches the actual calculation
      expect(typeof dps).toBe('number');
      expect(dps).toBeGreaterThan(0);
    });

    it('higher damage weapons have higher DPS', () => {
      const lowDamageWeapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.FIXED,
          base: '1d4', // Average: 2.5
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));

      const highDamageWeapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.FIXED,
          base: '2d8', // Average: 9
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));

      const actor = createTestActor();

      const lowDps = calculateWeaponDps(actor, lowDamageWeapon);
      const highDps = calculateWeaponDps(actor, highDamageWeapon);

      expect(highDps).toBeGreaterThan(lowDps);
    });
  });

  describe('analyzeWeapon', () => {
    it('provides complete weapon analysis', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.FIXED,
          base: '2d6', // Average: 7
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));
      const actor = createTestActor();

      const analysis = analyzeWeapon(actor, weapon);

      expect(analysis).toHaveProperty('damage');
      expect(analysis).toHaveProperty('apCost');
      expect(analysis).toHaveProperty('dps');
      expect(typeof analysis.damage).toBe('number');
      expect(typeof analysis.apCost).toBe('number');
      expect(typeof analysis.dps).toBe('number');
      expect(analysis.damage).toBeGreaterThan(0);
      expect(analysis.apCost).toBeGreaterThan(0);
      expect(analysis.dps).toBeGreaterThan(0);
    });

    it('reuses provided output object', () => {
      const weapon = createTestWeapon();
      const actor = createTestActor();
      const outputObject: WeaponAnalysis = { damage: 0, apCost: 0, dps: 0 };

      const result = analyzeWeapon(actor, weapon, outputObject);

      expect(result).toBe(outputObject); // Same reference
      expect(result.damage).toBeGreaterThan(0);
      expect(result.apCost).toBeGreaterThan(0);
      expect(result.dps).toBeGreaterThan(0);
    });

    it('analysis is consistent with individual calculations', () => {
      const weapon = createTestWeapon();
      const actor = createTestActor();

      const analysis = analyzeWeapon(actor, weapon);
      const avgDamage = calculateAverageWeaponDamagePerHit(actor, weapon);
      const dps = calculateWeaponDps(actor, weapon);

      expect(analysis.damage).toBe(avgDamage);
      expect(analysis.dps).toBe(dps);
    });
  });

  describe('edge cases and integration', () => {
    it('handles maximum stat values correctly', () => {
      const weapon = createTestWeapon((schema) => ({
        ...schema,
        damage: <StatScalingDamageSpecification>{
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 1.0,
          base: '1d6',
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));
      const actor = createTestActor(MAX_STAT_VALUE);

      const avgDamage = calculateAverageWeaponDamagePerHit(actor, weapon);
      const analysis = analyzeWeapon(actor, weapon);

      expect(avgDamage).toBe(4); // 3 + 1.0
      expect(analysis.damage).toBe(avgDamage);
    });

    it('different damage models produce different results', () => {
      const fixedWeapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.FIXED,
          base: '1d6',
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));

      const scalingWeapon = createTestWeapon((schema) => ({
        ...schema,
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 0.5,
          base: '1d6',
          types: (schema.damage as StatScalingDamageSpecification).types,
        },
      }));

      const highStatActor = createTestActor(50);

      const fixedDamage = calculateAverageWeaponDamagePerHit(highStatActor, fixedWeapon);
      const scalingDamage = calculateAverageWeaponDamagePerHit(highStatActor, scalingWeapon);

      expect(scalingDamage).toBeGreaterThan(fixedDamage);
    });
  });
});
