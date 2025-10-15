import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from './index';
import { Actor, Stat } from '~/types/entity/actor';
import {
  getStat,
  getStatValue,
  getNaturalStatValue,
  getStatModifiers,
  getStatBonus,
  hasActiveStatModifiers,
  computeStatValue,
  getAllStats,
  setNaturalStatValue,
  setStatValue,
  setStatModifiers,
  refreshStats,
  calculateStatBonus,
  BASELINE_STAT_VALUE,
  MAX_STAT_VALUE,
} from './stats';
import { AppliedModifiers } from '~/types/modifier';

describe('Actor Stats Module', () => {
  let actor: Actor;

  beforeEach(() => {
    actor = createActor({
      name: 'Test Actor',
      description: { base: 'Test actor for stats testing' },
    });
  });

  describe('Core Stat Access', () => {
    it('should get core stats from actor.stats', () => {
      const intStat = getStat(actor, Stat.INT);
      expect(intStat).toBe(actor.stats[Stat.INT]);
      expect(intStat.nat).toBe(10);
      expect(intStat.eff).toBe(10);
    });

    it('should get effective values for core stats', () => {
      expect(getStatValue(actor, Stat.INT)).toBe(10);
      expect(getStatValue(actor, Stat.PER)).toBe(10);
      expect(getStatValue(actor, Stat.MEM)).toBe(10);
    });

    it('should get natural values for core stats', () => {
      expect(getNaturalStatValue(actor, Stat.INT)).toBe(10);
      expect(getNaturalStatValue(actor, Stat.PER)).toBe(10);
      expect(getNaturalStatValue(actor, Stat.MEM)).toBe(10);
    });
  });

  describe('Shell Stat Access', () => {
    it('should get shell stats from current shell', () => {
      const powStat = getStat(actor, Stat.POW);
      const currentShell = actor.shells[actor.currentShell];
      expect(powStat).toBe(currentShell.stats[Stat.POW]);
      expect(powStat.nat).toBe(10);
      expect(powStat.eff).toBe(10);
    });

    it('should get effective values for shell stats', () => {
      expect(getStatValue(actor, Stat.POW)).toBe(10);
      expect(getStatValue(actor, Stat.FIN)).toBe(10);
      expect(getStatValue(actor, Stat.RES)).toBe(10);
    });

    it('should get natural values for shell stats', () => {
      expect(getNaturalStatValue(actor, Stat.POW)).toBe(10);
      expect(getNaturalStatValue(actor, Stat.FIN)).toBe(10);
      expect(getNaturalStatValue(actor, Stat.RES)).toBe(10);
    });
  });

  describe('Stat Routing', () => {
    it('should route core stats to actor.stats', () => {
      // Modify core stat directly
      actor.stats[Stat.INT].eff = 15;
      expect(getStatValue(actor, Stat.INT)).toBe(15);
    });

    it('should route shell stats to current shell', () => {
      // Modify shell stat directly
      const currentShell = actor.shells[actor.currentShell];
      currentShell.stats[Stat.POW].eff = 20;
      expect(getStatValue(actor, Stat.POW)).toBe(20);
    });

    it('should handle missing current shell gracefully', () => {
      actor.currentShell = 'nonexistent';
      expect(() => getStat(actor, Stat.POW)).toThrow('Actor has no current shell');
    });
  });

  describe('Stat Modifiers', () => {
    it('should get stat modifiers', () => {
      const modifiers: AppliedModifiers = { 'flux:mod:test-mod': { schema: 'flux:schema:modifier:test-mod', position: 0.5, value: 5 } };
      actor.stats[Stat.INT].mods = modifiers;

      expect(getStatModifiers(actor, Stat.INT)).toEqual(modifiers);
    });

    it('should detect active modifiers', () => {
      // No modifiers initially
      expect(hasActiveStatModifiers(actor, Stat.INT)).toBe(false);

      // Add active modifier
      actor.stats[Stat.INT].mods = { 'flux:mod:test-mod': { schema: 'flux:schema:modifier:test-mod', position: 0.5, value: 5 } };
      expect(hasActiveStatModifiers(actor, Stat.INT)).toBe(true);

      // Add inactive modifier (position >= 1.0)
      actor.stats[Stat.INT].mods = { 'flux:mod:test-mod': { schema: 'flux:schema:modifier:test-mod', position: 1.0, value: 5 } };
      expect(hasActiveStatModifiers(actor, Stat.INT)).toBe(false);
    });
  });

  describe('Stat Calculations', () => {
    it('should calculate stat bonuses correctly', () => {
      expect(calculateStatBonus(10)).toBe(0);  // Baseline
      expect(calculateStatBonus(12)).toBe(1);  // +2 = +1 bonus
      expect(calculateStatBonus(14)).toBe(2);  // +4 = +2 bonus
      expect(calculateStatBonus(8)).toBe(-1);  // -2 = -1 bonus
    });

    it('should get effective stat bonus', () => {
      actor.stats[Stat.INT].eff = 14;
      expect(getStatBonus(actor, Stat.INT)).toBe(2);
    });

    it('should compute effective stat values with modifiers', () => {
      actor.stats[Stat.INT].nat = 12;
      actor.stats[Stat.INT].mods = {
        'buff': { schema: 'flux:schema:modifier:buff', value: 3, position: 0.5 },
        'debuff': { schema: 'flux:schema:modifier:debuff', value: -1, position: 0.3 },
        'inactive': { schema: 'flux:schema:modifier:inactive', value: 10, position: 1.0 }, // Should be ignored
      };

      // 12 + 3 - 1 = 14 (inactive modifier ignored)
      expect(computeStatValue(actor, Stat.INT)).toBe(14);
    });

    it('should clamp computed values to valid range', () => {
      actor.stats[Stat.INT].nat = 5;
      actor.stats[Stat.INT].mods = { 'debuff': { schema: 'flux:schema:modifier:debuff', value: -10, position: 0.5 } };

      // Should clamp to BASELINE_STAT_VALUE
      expect(computeStatValue(actor, Stat.INT)).toBe(BASELINE_STAT_VALUE);

      actor.stats[Stat.INT].nat = 90;
      actor.stats[Stat.INT].mods = { 'buff': { schema: 'flux:schema:modifier:buff', value: 20, position: 0.5 } };

      // Should clamp to MAX_STAT_VALUE
      expect(computeStatValue(actor, Stat.INT)).toBe(MAX_STAT_VALUE);
    });
  });

  describe('Stat Manipulation', () => {
    it('should set natural stat values', () => {
      setNaturalStatValue(actor, Stat.INT, 15);
      expect(getNaturalStatValue(actor, Stat.INT)).toBe(15);

      setNaturalStatValue(actor, Stat.POW, 20);
      expect(getNaturalStatValue(actor, Stat.POW)).toBe(20);
    });

    it('should set effective stat values', () => {
      setStatValue(actor, Stat.INT, 18);
      expect(getStatValue(actor, Stat.INT)).toBe(18);

      setStatValue(actor, Stat.POW, 25);
      expect(getStatValue(actor, Stat.POW)).toBe(25);
    });

    it('should set stat modifiers', () => {
      const modifiers: AppliedModifiers = { 'flux:mod:test-mod': { schema: 'flux:schema:modifier:test-mod', position: 0.5, value: 5 } };
      setStatModifiers(actor, Stat.INT, modifiers);
      expect(getStatModifiers(actor, Stat.INT)).toEqual(modifiers);
    });
  });

  describe('Stat Refresh', () => {
    it('should refresh all stats by default', () => {
      // Set up some natural values and modifiers
      setNaturalStatValue(actor, Stat.INT, 12);
      setStatModifiers(actor, Stat.INT, { 'buff': { schema: 'flux:schema:modifier:buff', value: 3, position: 0.5 } });

      setNaturalStatValue(actor, Stat.POW, 15);
      setStatModifiers(actor, Stat.POW, { 'debuff': { schema: 'flux:schema:modifier:debuff', value: -2, position: 0.3 } });

      // Manually set incorrect effective values
      setStatValue(actor, Stat.INT, 999);
      setStatValue(actor, Stat.POW, 999);

      // Refresh should recalculate correct effective values
      refreshStats(actor);

      expect(getStatValue(actor, Stat.INT)).toBe(15); // 12 + 3
      expect(getStatValue(actor, Stat.POW)).toBe(13); // 15 - 2
    });

    it('should refresh specific stats when requested', () => {
      setNaturalStatValue(actor, Stat.INT, 12);
      setStatModifiers(actor, Stat.INT, { 'buff': { schema: 'flux:schema:modifier:buff', value: 3, position: 0.5 } });

      setNaturalStatValue(actor, Stat.POW, 15);
      setStatModifiers(actor, Stat.POW, { 'debuff': { schema: 'flux:schema:modifier:debuff', value: -2, position: 0.3 } });

      // Set incorrect effective values
      setStatValue(actor, Stat.INT, 999);
      setStatValue(actor, Stat.POW, 999);

      // Refresh only INT
      refreshStats(actor, [Stat.INT]);

      expect(getStatValue(actor, Stat.INT)).toBe(15); // Refreshed
      expect(getStatValue(actor, Stat.POW)).toBe(999); // Not refreshed
    });
  });

  describe('Get All Stats', () => {
    it('should return unified view of all stats', () => {
      // Modify some stats
      setStatValue(actor, Stat.INT, 12);
      setStatValue(actor, Stat.PER, 14);
      setStatValue(actor, Stat.MEM, 16);
      setStatValue(actor, Stat.POW, 18);
      setStatValue(actor, Stat.FIN, 20);
      setStatValue(actor, Stat.RES, 22);

      const allStats = getAllStats(actor);

      expect(allStats[Stat.INT].eff).toBe(12);
      expect(allStats[Stat.PER].eff).toBe(14);
      expect(allStats[Stat.MEM].eff).toBe(16);
      expect(allStats[Stat.POW].eff).toBe(18);
      expect(allStats[Stat.FIN].eff).toBe(20);
      expect(allStats[Stat.RES].eff).toBe(22);
    });

    it('should handle missing current shell', () => {
      actor.currentShell = 'nonexistent';
      expect(() => getAllStats(actor)).toThrow('Actor has no current shell');
    });
  });

  describe('Constants', () => {
    it('should export correct constants', () => {
      expect(BASELINE_STAT_VALUE).toBe(10);
      expect(MAX_STAT_VALUE).toBe(100);
    });
  });
});
