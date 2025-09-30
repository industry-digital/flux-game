import { BASELINE_STAT_VALUE } from '~/worldkit/entity/actor/stats';

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
