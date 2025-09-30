import { BASELINE_STAT_VALUE } from '~/worldkit/entity/actor/stats';
import { Shell } from '~/types/entity/shell';
import { ShellMutation, ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { createShellPreview } from '~/worldkit/workbench/preview';
import { applyShellMutations } from '~/worldkit/workbench/execution';

/**
 * Compute the resource cost of a single mutation
 */
export const calculateMutationCost = (shell: Shell, mutation: ShellMutation): number => {
  switch (mutation.type) {
    case ShellMutationType.STAT: {
      const currentValue = shell.stats[mutation.stat].eff;
      let targetValue: number;

      if (mutation.operation === StatMutationOperation.ADD) {
        targetValue = currentValue + mutation.amount;
      } else {
        targetValue = currentValue - mutation.amount;
      }

      return calculateShellStatUpgradeCost(currentValue, targetValue);
    }

    default: {
      return 0;
    }
  }
}

/**
 * Compute the total resource cost of a list of mutations
 */
export const calculateTotalCost = (shell: Shell, mutations: ShellMutation[]): number => {
  let totalCost = 0;

  // Create a working copy to track cumulative changes for cost calculation
  const workingShell = createShellPreview(shell, []);

  for (const mutation of mutations) {
    // Calculate cost based on current working state
    const cost = calculateMutationCost(workingShell, mutation);
    totalCost += cost;

    // Apply this mutation to working shell for next iteration
    applyShellMutations(workingShell, [mutation]);
  }

  return totalCost;
}

/**
 * Shell stat upgrade cost calculation with tiered exponential growth
 *
 * Design goals:
 * - Low cost to reach ~50
 * - Extreme cost as stat level approaches MAX_STAT_VALUE
 *
 * Formula: Powers of logBase tiered system where tier = Math.floor(level / 10)
 * Cost per level = logBase^tier
 *
 * Tiers:
 * - Tier 1 (10-19): 3^1 ->        3 / level
 * - Tier 2 (20-29): 3^2 ->        9 / level
 * - Tier 3 (30-39): 3^3 ->       27 / level
 * - Tier 4 (40-49): 3^4 ->       81 / level
 * - Tier 5 (50-59): 3^5 ->      243 / level
 * - Tier 6 (60-69): 3^6 ->      729 / level
 * - Tier 7 (70-79): 3^7 ->     2187 / level
 * - Tier 8 (80-89): 3^8 ->     6561 / level
 * - Tier 9 (90-99): 3^9 ->    19683 / level
 */
export const calculateShellStatUpgradeCost = (
  currentValue: number,
  targetValue: number,
  logBase: number = 3,
): number => {
  if (targetValue <= currentValue) {
    return 0; // No cost for downgrades or same value
  }

  let totalCost = 0;

  // Calculate cumulative cost for each individual upgrade step
  for (let level = currentValue; level < targetValue; level++) {
    if (level < BASELINE_STAT_VALUE) {
      // Below baseline - very cheap recovery cost
      return 5;
    }

    // Straight powers of logBase: cost = logBase^tier where tier = Math.floor(level / logBase)
    const tier = Math.floor(level / 10);
    totalCost += Math.pow(logBase, tier);
  }

  return Math.floor(totalCost);
};
