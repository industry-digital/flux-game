import { bench, describe } from 'vitest';
import { Stat } from '~/types/entity/actor';
import {
  createShell,
  mutateShellStats,
  applyShellStats,
  cloneShell,
  ShellStatsInput,
} from './index';

// Test data setup
const createBenchmarkStats = () => ({
  [Stat.POW]: 15,
  [Stat.FIN]: 12,
  [Stat.RES]: 18,
});

const benchmarkInput: ShellStatsInput = {
  [Stat.POW]: 25,
  [Stat.FIN]: 20,
  [Stat.RES]: 30,
};

// Simulate the old allocation-heavy approach for comparison
const oldApplyShellStats = (stats: any, input: ShellStatsInput) => {
  const newStats = { ...stats }; // 1 allocation

  if (input[Stat.POW] !== undefined) {
    newStats[Stat.POW] = { // 2nd allocation
      ...newStats[Stat.POW],
      nat: input[Stat.POW]!,
      eff: input[Stat.POW]!,
    };
    delete newStats[Stat.POW].mods;
  }

  if (input[Stat.FIN] !== undefined) {
    newStats[Stat.FIN] = { // 3rd allocation
      ...newStats[Stat.FIN],
      nat: input[Stat.FIN]!,
      eff: input[Stat.FIN]!,
    };
    delete newStats[Stat.FIN].mods;
  }

  if (input[Stat.RES] !== undefined) {
    newStats[Stat.RES] = { // 4th allocation
      ...newStats[Stat.RES],
      nat: input[Stat.RES]!,
      eff: input[Stat.RES]!,
    };
    delete newStats[Stat.RES].mods;
  }

  return newStats;
};

describe('Shell Stats Performance Benchmarks', () => {
  describe('Direct Stat Mutation Benchmarks', () => {
    bench('OLD: Multiple allocations per stat update', () => {
      const stats = createBenchmarkStats();
      oldApplyShellStats(stats, benchmarkInput);
    });

    bench('NEW: Zero-allocation mutation', () => {
      const stats = createBenchmarkStats();
      mutateShellStats(stats, benchmarkInput);
    });

    bench('NEW: Minimal allocation (shallow copy + mutation)', () => {
      const stats = createBenchmarkStats();
      applyShellStats(stats, benchmarkInput);
    });
  });

  describe('Shell Operations Benchmarks', () => {
    bench('Shell creation with default stats', () => {
      createShell();
    });

    bench('Shell creation with custom stats', () => {
      createShell({
        name: 'Benchmark Shell',
        stats: createBenchmarkStats(),
      });
    });

    bench('Deep clone shell (JSON approach)', () => {
      const shell = createShell();
      cloneShell(shell);
    });
  });

  describe('Realistic Workbench Scenario Benchmarks', () => {
    bench('OLD: Workbench stat update (multiple allocations)', () => {
      const shell = createShell();
      // Simulate old pattern: create new stats object with allocations
      const newStats = oldApplyShellStats(shell.stats, benchmarkInput);
      const newShell = { ...shell, stats: newStats };
    });

    bench('NEW: Workbench stat update (clone + mutate)', () => {
      const shell = createShell();
      // Simulate new pattern: clone for safety, mutate for performance
      const clonedShell = cloneShell(shell);
      mutateShellStats(clonedShell.stats, benchmarkInput);
    });

    bench('NEW: Performance-critical stat update (direct mutation)', () => {
      const shell = createShell();
      // Simulate performance-critical path: direct mutation
      mutateShellStats(shell.stats, benchmarkInput);
    });
  });

  describe('Batch Operations Benchmarks', () => {
    bench('OLD: Batch stat updates (10 shells)', () => {
      const shells = Array.from({ length: 10 }, () => createShell());

      for (const shell of shells) {
        const newStats = oldApplyShellStats(shell.stats, benchmarkInput);
        const newShell = { ...shell, stats: newStats };
      }
    });

    bench('NEW: Batch stat updates with cloning (10 shells)', () => {
      const shells = Array.from({ length: 10 }, () => createShell());

      for (const shell of shells) {
        const clonedShell = cloneShell(shell);
        mutateShellStats(clonedShell.stats, benchmarkInput);
      }
    });

    bench('NEW: Batch stat updates with direct mutation (10 shells)', () => {
      const shells = Array.from({ length: 10 }, () => createShell());

      for (const shell of shells) {
        mutateShellStats(shell.stats, benchmarkInput);
      }
    });
  });

  describe('Memory Allocation Stress Tests', () => {
    bench('OLD: High-frequency stat updates (100 iterations)', () => {
      const stats = createBenchmarkStats();

      for (let i = 0; i < 100; i++) {
        oldApplyShellStats(stats, {
          [Stat.POW]: 10 + i,
          [Stat.FIN]: 15 + i,
          [Stat.RES]: 20 + i,
        });
      }
    });

    bench('NEW: High-frequency stat updates (100 iterations)', () => {
      const stats = createBenchmarkStats();

      for (let i = 0; i < 100; i++) {
        mutateShellStats(stats, {
          [Stat.POW]: 10 + i,
          [Stat.FIN]: 15 + i,
          [Stat.RES]: 20 + i,
        });
      }
    });

    bench('Single stat update comparison - OLD', () => {
      const stats = createBenchmarkStats();
      oldApplyShellStats(stats, { [Stat.POW]: 25 });
    });

    bench('Single stat update comparison - NEW', () => {
      const stats = createBenchmarkStats();
      mutateShellStats(stats, { [Stat.POW]: 25 });
    });
  });
});

describe('Real-World Gaming Scenarios', () => {
  describe('Combat Stat Modifications', () => {
    bench('Combat buff application (temporary stat boost)', () => {
      const shell = createShell();
      // Simulate temporary buff that needs to be fast
      mutateShellStats(shell.stats, {
        [Stat.POW]: shell.stats[Stat.POW] + 5,
        [Stat.FIN]: shell.stats[Stat.FIN] + 3,
      });
    });

    bench('Equipment stat recalculation', () => {
      const shell = createShell();
      // Simulate equipment change requiring stat recalculation
      const equipmentBonus = { [Stat.POW]: 8, [Stat.RES]: 12 };
      mutateShellStats(shell.stats, equipmentBonus);
    });
  });

  describe('Workbench Stat Customization', () => {
    bench('Workbench stat allocation (safe pattern)', () => {
      const originalShell = createShell();
      // Simulate player allocating stat points at workbench
      const clonedShell = cloneShell(originalShell);
      mutateShellStats(clonedShell.stats, {
        [Stat.POW]: 22,
        [Stat.FIN]: 18,
        [Stat.RES]: 25,
      });
    });

    bench('Workbench stat preview (performance pattern)', () => {
      const shell = createShell();
      // Simulate live preview of stat changes (needs to be fast)
      const previewStats = { ...shell.stats };
      mutateShellStats(previewStats, {
        [Stat.POW]: 30,
        [Stat.FIN]: 25,
      });
    });
  });
});
