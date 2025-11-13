import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from './index';
import { Actor, Stat } from '~/types/entity/actor';
import {
  getStat,
  getStatValue,
  getAllStats,
  setStatValue,
  BASELINE_STAT_VALUE,
  MAX_STAT_VALUE,
} from './stats';
import { DEFAULT_TIMESTAMP } from '~/testing/constants';

const NOW = DEFAULT_TIMESTAMP;
const ONE_MINUTE_AGO = NOW - 60_000;
const ONE_MINUTE_FROM_NOW = NOW + 60_000;

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
      expect(intStat).toBe(10);
    });

    it('should get effective values for core stats', () => {
      expect(getStatValue(actor, Stat.INT)).toBe(10);
      expect(getStatValue(actor, Stat.PER)).toBe(10);
      expect(getStatValue(actor, Stat.MEM)).toBe(10);
    });

    it('should get natural values for core stats', () => {
      expect(getStatValue(actor, Stat.INT)).toBe(10);
      expect(getStatValue(actor, Stat.PER)).toBe(10);
      expect(getStatValue(actor, Stat.MEM)).toBe(10);
    });
  });

  describe('Shell Stat Access', () => {
    it('should get shell stats from actor.stats', () => {
      const powStat = getStat(actor, Stat.POW);
      expect(powStat).toBe(actor.stats[Stat.POW]);
      expect(getStatValue(actor, Stat.POW)).toBe(10);
    });

    it('should get effective values for shell stats', () => {
      expect(getStatValue(actor, Stat.POW)).toBe(10);
      expect(getStatValue(actor, Stat.FIN)).toBe(10);
      expect(getStatValue(actor, Stat.RES)).toBe(10);
    });

    it('should get natural values for shell stats', () => {
      expect(getStatValue(actor, Stat.POW)).toBe(10);
      expect(getStatValue(actor, Stat.FIN)).toBe(10);
      expect(getStatValue(actor, Stat.RES)).toBe(10);
    });
  });

  describe('Stat Access', () => {
    it('should set and get core stats from actor.stats', () => {
      setStatValue(actor, Stat.INT, 15);
      expect(getStatValue(actor, Stat.INT)).toBe(15);
    });

    it('should set and get shell stats from actor.stats', () => {
      setStatValue(actor, Stat.POW, 20);
      expect(getStatValue(actor, Stat.POW)).toBe(20);
    });

    it('should access all stats directly from actor.stats', () => {
      expect(actor.stats[Stat.INT]).toBe(10);
      expect(actor.stats[Stat.POW]).toBe(10);
    });
  });

  describe('Stat Manipulation', () => {
    it('should set natural stat values', () => {
      setStatValue(actor, Stat.INT, 15);
      expect(getStatValue(actor, Stat.INT)).toBe(15);

      setStatValue(actor, Stat.POW, 20);
      expect(getStatValue(actor, Stat.POW)).toBe(20);
    });

    it('should set effective stat values', () => {
      setStatValue(actor, Stat.INT, 18);
      expect(getStatValue(actor, Stat.INT)).toBe(18);

      setStatValue(actor, Stat.POW, 25);
      expect(getStatValue(actor, Stat.POW)).toBe(25);
    });
  });

  describe('Get All Stats', () => {
    it('should return all stats from actor.stats', () => {
      // Modify some stats
      setStatValue(actor, Stat.INT, 12);
      setStatValue(actor, Stat.PER, 14);
      setStatValue(actor, Stat.MEM, 16);
      setStatValue(actor, Stat.POW, 18);
      setStatValue(actor, Stat.FIN, 20);
      setStatValue(actor, Stat.RES, 22);

      const allStats = getAllStats(actor);

      expect(allStats[Stat.INT]).toBe(12);
      expect(allStats[Stat.PER]).toBe(14);
      expect(allStats[Stat.MEM]).toBe(16);
      expect(allStats[Stat.POW]).toBe(18);
      expect(allStats[Stat.FIN]).toBe(20);
      expect(allStats[Stat.RES]).toBe(22);
    });

    it('should return reference to actor.stats', () => {
      const allStats = getAllStats(actor);
      expect(allStats).toBe(actor.stats);
    });
  });

  describe('Constants', () => {
    it('should export correct constants', () => {
      expect(BASELINE_STAT_VALUE).toBe(10);
      expect(MAX_STAT_VALUE).toBe(100);
    });
  });
});
