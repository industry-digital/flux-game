import { bench, describe } from 'vitest';
import { ActorStat } from '~/types/entity/actor';
import { createModifiableScalarAttribute } from '~/worldkit/entity';
import {
  createShell,
  mutateShellStats,
  applyShellStats,
  cloneShell,
  ShellStatsInput,
} from './index';

// Test data setup
const createBenchmarkStats = () => ({
  [ActorStat.POW]: createModifiableScalarAttribute((attr) => ({ ...attr, nat: 15, eff: 15 })),
  [ActorStat.FIN]: createModifiableScalarAttribute((attr) => ({ ...attr, nat: 12, eff: 12 })),
  [ActorStat.RES]: createModifiableScalarAttribute((attr) => ({ ...attr, nat: 18, eff: 18 })),
});

const benchmarkInput: ShellStatsInput = {
  [ActorStat.POW]: 25,
  [ActorStat.FIN]: 20,
  [ActorStat.RES]: 30,
};

// Simulate the old allocation-heavy approach for comparison
const oldApplyShellStats = (stats: any, input: ShellStatsInput) => {
  const newStats = { ...stats }; // 1 allocation

  if (input[ActorStat.POW] !== undefined) {
    newStats[ActorStat.POW] = { // 2nd allocation
      ...newStats[ActorStat.POW],
      nat: input[ActorStat.POW]!,
      eff: input[ActorStat.POW]!,
    };
    delete newStats[ActorStat.POW].mods;
  }

  if (input[ActorStat.FIN] !== undefined) {
    newStats[ActorStat.FIN] = { // 3rd allocation
      ...newStats[ActorStat.FIN],
      nat: input[ActorStat.FIN]!,
      eff: input[ActorStat.FIN]!,
    };
    delete newStats[ActorStat.FIN].mods;
  }

  if (input[ActorStat.RES] !== undefined) {
    newStats[ActorStat.RES] = { // 4th allocation
      ...newStats[ActorStat.RES],
      nat: input[ActorStat.RES]!,
      eff: input[ActorStat.RES]!,
    };
    delete newStats[ActorStat.RES].mods;
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
          [ActorStat.POW]: 10 + i,
          [ActorStat.FIN]: 15 + i,
          [ActorStat.RES]: 20 + i,
        });
      }
    });

    bench('NEW: High-frequency stat updates (100 iterations)', () => {
      const stats = createBenchmarkStats();

      for (let i = 0; i < 100; i++) {
        mutateShellStats(stats, {
          [ActorStat.POW]: 10 + i,
          [ActorStat.FIN]: 15 + i,
          [ActorStat.RES]: 20 + i,
        });
      }
    });

    bench('Single stat update comparison - OLD', () => {
      const stats = createBenchmarkStats();
      oldApplyShellStats(stats, { [ActorStat.POW]: 25 });
    });

    bench('Single stat update comparison - NEW', () => {
      const stats = createBenchmarkStats();
      mutateShellStats(stats, { [ActorStat.POW]: 25 });
    });
  });
});

describe('Real-World Gaming Scenarios', () => {
  describe('Combat Stat Modifications', () => {
    bench('Combat buff application (temporary stat boost)', () => {
      const shell = createShell();
      // Simulate temporary buff that needs to be fast
      mutateShellStats(shell.stats, {
        [ActorStat.POW]: shell.stats[ActorStat.POW].nat + 5,
        [ActorStat.FIN]: shell.stats[ActorStat.FIN].nat + 3,
      });
    });

    bench('Equipment stat recalculation', () => {
      const shell = createShell();
      // Simulate equipment change requiring stat recalculation
      const equipmentBonus = { [ActorStat.POW]: 8, [ActorStat.RES]: 12 };
      mutateShellStats(shell.stats, equipmentBonus);
    });
  });

  describe('Workbench Stat Customization', () => {
    bench('Workbench stat allocation (safe pattern)', () => {
      const originalShell = createShell();
      // Simulate player allocating stat points at workbench
      const clonedShell = cloneShell(originalShell);
      mutateShellStats(clonedShell.stats, {
        [ActorStat.POW]: 22,
        [ActorStat.FIN]: 18,
        [ActorStat.RES]: 25,
      });
    });

    bench('Workbench stat preview (performance pattern)', () => {
      const shell = createShell();
      // Simulate live preview of stat changes (needs to be fast)
      const previewStats = { ...shell.stats };
      mutateShellStats(previewStats, {
        [ActorStat.POW]: 30,
        [ActorStat.FIN]: 25,
      });
    });
  });
});
