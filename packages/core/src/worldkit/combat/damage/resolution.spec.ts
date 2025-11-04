import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Stat } from '~/types/entity/actor';
import { TransformerContext } from '~/types/handler';
import { DamageModel } from '~/types/damage';
import { Actor } from '~/types/entity/actor';
import {
  calculateAverageWeaponDamagePerHit,
  rollWeaponDamage,
  calculateWeaponDps,
  analyzeWeapon,
  RollWeaponDamageDependencies,
  WeaponAnalysis
} from './resolution';
import { MAX_STAT_VALUE, setStatValue } from '~/worldkit/entity/actor/stats';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createDefaultActors } from '~/testing/actors';
import { WeaponSchema, WeaponTimer, WeaponTimers } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';
import { RollSpecification } from '~/types/dice';
import { calculateWeaponApCost } from '~/worldkit/combat/ap';

describe('Damage Resolution', () => {
  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let weapon: WeaponSchema;
  let alice: Actor;
  let bob: Actor;

  beforeEach(() => {
    context = createTransformerContext();
    scenario = createWorldScenario(context);

    ({ alice, bob } = createDefaultActors());

    // Ensure actors have POW stat initialized for tests
    setStatValue(alice, Stat.POW, 10);
    setStatValue(bob, Stat.POW, 10);

    weapon = createWeaponSchema({
      urn: 'flux:schema:weapon:test',
      name: 'Test Weapon',
      damage: {
        model: DamageModel.FIXED,
        base: '2d6',
      },
    });

    scenario.assignWeapon(alice, weapon);
    scenario.assignWeapon(bob, weapon);
  });

  describe('calculateAverageWeaponDamagePerHit', () => {
    it('uses base damage calculation for fixed damage model', () => {
      const mockDeps = {
        rollDice: vi.fn(),
        getStatValue: vi.fn().mockReturnValue(15),
        getWeaponBaseDamage: vi.fn().mockReturnValue('2d6'),
        calculateAverageRollResult: vi.fn().mockReturnValue(7.5),
      };

      const avgDamage = calculateAverageWeaponDamagePerHit(alice, weapon, mockDeps);

      expect(mockDeps.getWeaponBaseDamage).toHaveBeenCalledWith(weapon);
      expect(mockDeps.calculateAverageRollResult).toHaveBeenCalledWith('2d6');
      expect(avgDamage).toBe(7.5);
    });

    it('applies stat scaling bonus for stat-scaling model', () => {
      const scalingWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:test',
        name: 'Test Weapon',
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 0.5,
          base: '1d6',
        },
      });

      const mockDeps = {
        rollDice: vi.fn(),
        getStatValue: vi.fn().mockReturnValue(20), // 20/100 * 0.5 = 0.1 bonus
        getWeaponBaseDamage: vi.fn().mockReturnValue('1d6'),
        calculateAverageRollResult: vi.fn().mockReturnValue(3.5),
      };

      const avgDamage = calculateAverageWeaponDamagePerHit(alice, scalingWeapon, mockDeps);

      expect(mockDeps.getStatValue).toHaveBeenCalledWith(alice, Stat.POW);
      expect(avgDamage).toBe(3.6); // 3.5 + 0.1
    });

    it('returns only base damage when stat scaling efficiency is zero', () => {
      const scalingWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:test',
        name: 'Test Weapon',
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 0,
          base: '1d6',
        },
      });

      const mockDeps = {
        rollDice: vi.fn(),
        getStatValue: vi.fn().mockReturnValue(50),
        getWeaponBaseDamage: vi.fn().mockReturnValue('1d6'),
        calculateAverageRollResult: vi.fn().mockReturnValue(3.5),
      };

      const avgDamage = calculateAverageWeaponDamagePerHit(alice, scalingWeapon, mockDeps);

      expect(avgDamage).toBe(3.5); // No bonus applied
    });

    it('scales linearly with stat value', () => {
      const scalingWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:test',
        name: 'Test Weapon',
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 1.0,
          base: '1d6',
        },
      });

      const mockDeps = {
        rollDice: vi.fn(),
        getStatValue: vi.fn(),
        getWeaponBaseDamage: vi.fn().mockReturnValue('1d6'),
        calculateAverageRollResult: vi.fn().mockReturnValue(3.5),
      };

      // Test with different stat values
      mockDeps.getStatValue.mockReturnValue(0);
      const lowStatDamage = calculateAverageWeaponDamagePerHit(alice, scalingWeapon, mockDeps);

      mockDeps.getStatValue.mockReturnValue(MAX_STAT_VALUE);
      const maxStatDamage = calculateAverageWeaponDamagePerHit(alice, scalingWeapon, mockDeps);

      expect(lowStatDamage).toBe(3.5); // Base damage only
      expect(maxStatDamage).toBe(4.5); // Base + full efficiency bonus
      expect(maxStatDamage).toBeGreaterThan(lowStatDamage);
    });
  });

  describe('rollWeaponDamage', () => {
    it('returns base damage roll for fixed damage model', () => {
      const mockBaseDamageRoll = {
        values: [4, 2],
        dice: '2d6' as RollSpecification,
        natural: 6,
        bonus: 0,
        result: 6
      };

      const mockDeps: RollWeaponDamageDependencies = {
        rollDice: vi.fn().mockReturnValue(mockBaseDamageRoll),
        timestamp: vi.fn().mockReturnValue(1000),
      };

      const result = rollWeaponDamage(alice, weapon, mockDeps);

      expect(result).toBe(mockBaseDamageRoll); // Should return the exact same object for fixed damage
      expect(mockDeps.rollDice).toHaveBeenCalledWith('2d6');
    });

    it('applies stat scaling modifier for stat-scaling damage model', () => {
      const scalingWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:test',
        name: 'Test Weapon',
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 0.5,
          base: '1d6',
        },
      });

      setStatValue(alice, Stat.POW, 20); // 20/100 * 0.5 = 0.1 bonus

      const mockBaseDamageRoll = {
        values: [4],
        dice: '1d6' as RollSpecification,
        natural: 4,
        bonus: 0,
        result: 4
      };

      const mockDeps: RollWeaponDamageDependencies = {
        rollDice: vi.fn().mockReturnValue(mockBaseDamageRoll),
        timestamp: vi.fn().mockReturnValue(1000),
      };

      const result = rollWeaponDamage(alice, scalingWeapon, mockDeps);

      expect(result.result).toBe(4.1); // 4 + 0.1
      expect(result.mods).toBeDefined();
      expect(result.mods!['stat:pow']).toBeDefined();
      expect(result.mods!['stat:pow'].value).toBe(0.1);
      expect(result.mods!['stat:pow'].origin).toBe('stat:pow');
      expect(result.mods!['stat:pow'].ts).toBe(1000);
    });

    it('applies minimal bonus when stat value is very low', () => {
      const scalingWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:test',
        name: 'Test Weapon',
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 1.0,
          base: '1d6',
        },
      });

      setStatValue(alice, Stat.POW, 1); // Very low stat value

      const mockBaseDamageRoll = {
        values: [3],
        dice: '1d6' as RollSpecification,
        natural: 3,
        bonus: 0,
        result: 3
      };

      const mockDeps: RollWeaponDamageDependencies = {
        rollDice: vi.fn().mockReturnValue(mockBaseDamageRoll),
        timestamp: vi.fn().mockReturnValue(1000),
      };

      const result = rollWeaponDamage(alice, scalingWeapon, mockDeps);

      expect(result.result).toBe(3.01); // 3 + (1/100 * 1.0) = 3.01
      expect(result.mods!['stat:pow'].value).toBe(0.01);
    });

    it('integrates with real dependencies when none provided', () => {
      setStatValue(alice, Stat.POW, 15);

      const result = rollWeaponDamage(alice, weapon);

      expect(typeof result.result).toBe('number');
      expect(result.result).toBeGreaterThan(0);
      expect(result.dice).toBe('2d6');
      expect(Array.isArray(result.values)).toBe(true);
    });
  });

  describe('calculateWeaponDps', () => {
    it('calculates DPS as damage divided by AP cost', () => {
      setStatValue(alice, Stat.POW, 15);

      const dps = calculateWeaponDps(alice, weapon);
      const avgDamage = calculateAverageWeaponDamagePerHit(alice, weapon);
      const apCost = calculateWeaponApCost(alice, weapon, WeaponTimer.ATTACK);

      expect(dps).toBe(avgDamage / apCost);
      expect(typeof dps).toBe('number');
      expect(dps).toBeGreaterThan(0);
    });

    it('higher damage weapons have higher DPS when AP costs are equal', () => {
      // Create two weapons with the same AP cost but different damage
      const lowDamageWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:low-damage',
        name: 'Low Damage Weapon',
        damage: {
          model: DamageModel.FIXED,
          base: '1d4',
        },
        // Same weight/timing as the high damage weapon to ensure equal AP costs
        baseMass: 1_000,
        timers: <WeaponTimers>{
          attack: 100,
          reload: 0,
        },
      });

      const highDamageWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:high-damage',
        name: 'High Damage Weapon',
        damage: {
          model: DamageModel.FIXED,
          base: '2d8',
        },
        // Same weight/timing as the low damage weapon to ensure equal AP costs
        baseMass: 1_000,
        timers: <WeaponTimers>{
          attack: 100,
          reload: 0,
        },
      });

      setStatValue(alice, Stat.POW, 15);

      const lowDps = calculateWeaponDps(alice, lowDamageWeapon);
      const highDps = calculateWeaponDps(alice, highDamageWeapon);

      expect(highDps).toBeGreaterThan(lowDps);
    });

    it('DPS decreases as AP cost increases', () => {
      const fastWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:fast',
        name: 'Fast Weapon',
        damage: {
          model: DamageModel.FIXED,
          base: '1d6',
        },
        baseMass: 1_000,
        timers: <WeaponTimers>{
          attack: 50, // Low AP cost
          reload: 0,
        },
      });

      const slowWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:slow',
        name: 'Slow Weapon',
        damage: {
          model: DamageModel.FIXED,
          base: '1d6',
        },
        baseMass: 1_000,
        timers: <WeaponTimers>{
          attack: 200, // High AP cost
          reload: 0,
        },
      });

      setStatValue(alice, Stat.POW, 15);

      const fastDps = calculateWeaponDps(alice, fastWeapon);
      const slowDps = calculateWeaponDps(alice, slowWeapon);

      expect(fastDps).toBeGreaterThan(slowDps);
    });
  });

  describe('analyzeWeapon', () => {
    it('provides complete weapon analysis with all required properties', () => {
      setStatValue(alice, Stat.POW, 15);

      const analysis = analyzeWeapon(alice, weapon);

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

    it('reuses provided output object for performance', () => {
      setStatValue(alice, Stat.POW, 15);
      const outputObject: WeaponAnalysis = { damage: 0, apCost: 0, dps: 0 };

      const result = analyzeWeapon(alice, weapon, outputObject);

      expect(result).toBe(outputObject); // Same reference
      expect(result.damage).toBeGreaterThan(0);
      expect(result.apCost).toBeGreaterThan(0);
      expect(result.dps).toBeGreaterThan(0);
    });

    it('analysis is consistent with individual calculations', () => {
      setStatValue(alice, Stat.POW, 15);

      const analysis = analyzeWeapon(alice, weapon);
      const avgDamage = calculateAverageWeaponDamagePerHit(alice, weapon);
      const apCost = calculateWeaponApCost(alice, weapon, WeaponTimer.ATTACK);
      const dps = calculateWeaponDps(alice, weapon);

      expect(analysis.damage).toBe(avgDamage);
      expect(analysis.apCost).toBe(apCost);
      expect(analysis.dps).toBe(dps);
    });

    it('DPS calculation matches manual calculation', () => {
      setStatValue(alice, Stat.POW, 15);

      const analysis = analyzeWeapon(alice, weapon);

      expect(analysis.dps).toBe(analysis.damage / analysis.apCost);
    });
  });

  describe('edge cases and integration', () => {
    it('stat scaling reaches maximum bonus at MAX_STAT_VALUE', () => {
      const scalingWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:test',
        name: 'Test Weapon',
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 1.0,
          base: '1d6',
        },
      });

      const mockDeps = {
        rollDice: vi.fn(),
        getStatValue: vi.fn().mockReturnValue(MAX_STAT_VALUE),
        getWeaponBaseDamage: vi.fn().mockReturnValue('1d6'),
        calculateAverageRollResult: vi.fn().mockReturnValue(3.5),
      };

      const avgDamage = calculateAverageWeaponDamagePerHit(alice, scalingWeapon, mockDeps);

      // Set the stat for the real analysis call
      setStatValue(alice, Stat.POW, MAX_STAT_VALUE);
      const analysis = analyzeWeapon(alice, scalingWeapon);

      expect(avgDamage).toBe(4.5); // 3.5 + (100/100 * 1.0) = 3.5 + 1.0
      expect(analysis.damage).toBe(avgDamage);
    });

    it('stat scaling produces higher damage than fixed model with sufficient stats', () => {
      const fixedWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:fixed',
        name: 'Fixed Weapon',
        damage: {
          model: DamageModel.FIXED,
          base: '1d6',
        },
      });

      const scalingWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:scaling',
        name: 'Scaling Weapon',
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 0.5,
          base: '1d6',
        },
      });

      setStatValue(alice, Stat.POW, 50); // 50/100 * 0.5 = 0.25 bonus

      const fixedDamage = calculateAverageWeaponDamagePerHit(alice, fixedWeapon);
      const scalingDamage = calculateAverageWeaponDamagePerHit(alice, scalingWeapon);

      expect(scalingDamage).toBeGreaterThan(fixedDamage);
      expect(scalingDamage - fixedDamage).toBe(0.25); // Exact bonus amount
    });

    it('stat scaling produces minimal bonus with very low stats', () => {
      const fixedWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:fixed',
        name: 'Fixed Weapon',
        damage: {
          model: DamageModel.FIXED,
          base: '1d6',
        },
      });

      const scalingWeapon = createWeaponSchema({
        urn: 'flux:schema:weapon:scaling',
        name: 'Scaling Weapon',
        damage: {
          model: DamageModel.STAT_SCALING,
          stat: Stat.POW,
          efficiency: 1.0,
          base: '1d6',
        },
      });

      setStatValue(alice, Stat.POW, 1); // Very low stat value

      const fixedDamage = calculateAverageWeaponDamagePerHit(alice, fixedWeapon);
      const scalingDamage = calculateAverageWeaponDamagePerHit(alice, scalingWeapon);

      expect(scalingDamage).toBeGreaterThan(fixedDamage); // Minimal bonus applied
      expect(scalingDamage - fixedDamage).toBeCloseTo(0.01, 5); // 1/100 * 1.0 = 0.01
    });
  });
});
