import { describe, expect, it, beforeEach } from 'vitest';
import { createPerformanceDiff, createStatDiff } from './diff';
import { Shell, ShellPerformanceProfile } from '~/types/entity/shell';
import { ActorStat } from '~/types/entity/actor';

describe('createShellDiff', () => {
  let mockShell: Shell;
  let mockCurrentPerf: ShellPerformanceProfile;
  let mockPreviewPerf: ShellPerformanceProfile;

  beforeEach(() => {
    mockShell = {
      id: 'test-shell-001',
      name: 'Test Combat Shell',
      stats: {
        [ActorStat.POW]: { nat: 10, eff: 10, mods: {} },
        [ActorStat.FIN]: { nat: 8, eff: 8, mods: {} },
        [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
      },
      inventory: { items: {}, mass: 0, ts: 123456790000 },
      equipment: {},
    };

    mockCurrentPerf = {
      gapClosing10: 2.5,
      gapClosing100: 15.8,
      avgSpeed10: 4.0,
      avgSpeed100: 6.3,
      peakPowerOutput: 500,
      componentPowerDraw: 50,
      freePower: 450,
      weaponDps: 15.2,
      weaponDamage: 12,
      weaponApCost: 3,
      totalMassKg: 85,
      inertialMassKg: 70,
      inertiaReduction: 17.6,
      powerToWeightRatio: 5.9,
      topSpeed: 12.1,
      capacitorCapacity: 2500,
      maxRechargeRate: 125,
    };

    mockPreviewPerf = {
      ...mockCurrentPerf,
      // Changes from POW 10->12, FIN 8->10
      weaponDps: 18.7,
      weaponDamage: 15,
      gapClosing10: 2.1,
      freePower: 380,
      totalMassKg: 87,
      powerToWeightRatio: 6.2,
    };
  });

  describe('happy path', () => {
    it('should create complete shell diff with stat and performance changes', () => {
      // Test the helper functions directly since they're pure functions
      const previewShell = {
        ...mockShell,
        stats: {
          [ActorStat.POW]: { nat: 12, eff: 12, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
      };

      // Test createStatDiff
      const statDiff = createStatDiff(mockShell, previewShell);
      expect(statDiff).toEqual({
        [ActorStat.POW]: '10 -> 12',
        [ActorStat.FIN]: '8 -> 10',
      });

      // Test createPerformanceDiff
      const perfDiff = createPerformanceDiff(mockCurrentPerf, mockPreviewPerf);
      expect(perfDiff.weaponDps).toBe('15.2 -> 18.7');
      expect(perfDiff.weaponDamage).toBe('12 -> 15');
      expect(perfDiff.gapClosing10).toBe('2.5 -> 2.1');
      expect(perfDiff.freePower).toBe('450 -> 380');
      expect(perfDiff.totalMassKg).toBe('85 -> 87');
      expect(perfDiff.powerToWeightRatio).toBe('5.9 -> 6.2');

      // Unchanged values should show current value
      expect(perfDiff.gapClosing100).toBe('15.8');
      expect(perfDiff.avgSpeed10).toBe('4');
      expect(perfDiff.peakPowerOutput).toBe('500');
      expect(perfDiff.capacitorCapacity).toBe('2500');
    });
  });

  describe('performance benchmark', () => {
    it('should create performance diffs efficiently', () => {
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        createPerformanceDiff(mockCurrentPerf, mockPreviewPerf);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`\nPerformance Diff Benchmark Results:`);
      console.log(`Total time for ${iterations} iterations: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per diff: ${avgTime.toFixed(4)}ms`);
      console.log(`Diffs per second: ${(1000 / avgTime).toFixed(0)}`);

      // Performance assertion - should be very fast for pure calculation
      expect(avgTime).toBeLessThan(1); // Less than 1ms per diff
    });

    it('should create stat diffs efficiently', () => {
      const previewShell = {
        ...mockShell,
        stats: {
          [ActorStat.POW]: { nat: 12, eff: 12, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
      };

      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        createStatDiff(mockShell, previewShell);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`\nStat Diff Benchmark Results:`);
      console.log(`Total time for ${iterations} iterations: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per diff: ${avgTime.toFixed(4)}ms`);
      console.log(`Diffs per second: ${(1000 / avgTime).toFixed(0)}`);

      // Performance assertion - should be very fast for pure calculation
      expect(avgTime).toBeLessThan(0.1); // Less than 0.1ms per diff
    });
  });

  describe('createPerformanceDiff', () => {
    it('should create performance diff with only changed values', () => {
      const result = createPerformanceDiff(mockCurrentPerf, mockPreviewPerf);

      expect(result.weaponDps).toBe('15.2 -> 18.7');
      expect(result.weaponDamage).toBe('12 -> 15');
      expect(result.gapClosing10).toBe('2.5 -> 2.1');
      expect(result.freePower).toBe('450 -> 380');
      expect(result.totalMassKg).toBe('85 -> 87');
      expect(result.powerToWeightRatio).toBe('5.9 -> 6.2');

      // Unchanged values should show current value
      expect(result.gapClosing100).toBe('15.8');
      expect(result.avgSpeed10).toBe('4');
      expect(result.peakPowerOutput).toBe('500');
      expect(result.capacitorCapacity).toBe('2500');
    });
  });

  describe('createStatDiff', () => {
    it('should return stat changes when stats differ', () => {
      const previewShell = {
        ...mockShell,
        stats: {
          [ActorStat.POW]: { nat: 12, eff: 12, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} }, // unchanged
        },
      };

      const result = createStatDiff(mockShell, previewShell);

      expect(result).toEqual({
        [ActorStat.POW]: '10 -> 12',
        [ActorStat.FIN]: '8 -> 10',
      });
    });

    it('should return undefined when no stats change', () => {
      const result = createStatDiff(mockShell, mockShell);
      expect(result).toBeUndefined();
    });
  });
});
