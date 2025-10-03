import { Shell } from '~/types/entity/shell';
import { ShellMutation, ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { WorldEvent } from '~/types/event';
import { SHELL_STAT_NAMES } from '~/worldkit/entity/actor/actor-stats';
import {
  getNaturalStatValue,
  mutateNaturalStatValue,
  refreshStats,
  BASELINE_STAT_VALUE,
  MAX_STAT_VALUE,
} from '~/worldkit/entity/stats';

/**
 * Safely mutates a shell stat's natural value with validation and refresh
 */
export const mutateShellStat = (
  shell: Shell,
  stat: keyof Shell['stats'],
  operation: StatMutationOperation,
  amount: number
): { from: number; to: number } => {
  const currentNaturalValue = getNaturalStatValue(shell, stat);

  let newNaturalValue: number;

  if (operation === StatMutationOperation.ADD) {
    newNaturalValue = currentNaturalValue + amount;
  } else {
    newNaturalValue = currentNaturalValue - amount;
  }

  // Clamp to valid stat range
  newNaturalValue = Math.max(BASELINE_STAT_VALUE, Math.min(MAX_STAT_VALUE, newNaturalValue));

  // Use the generic utility to update the natural value
  mutateNaturalStatValue(shell, stat, newNaturalValue);

  // Refresh the shell stats to recalculate effective values
  refreshStats(shell, SHELL_STAT_NAMES);

  return { from: currentNaturalValue, to: newNaturalValue };
};

/**
 * Applies shell mutations to the shell
 */
export const applyShellMutations = (shell: Shell, mutations: ShellMutation[]): WorldEvent[] => {
  const events: WorldEvent[] = [];
  const statChanges: Record<string, { from: number; to: number }> = {};

  for (const mutation of mutations) {
    switch (mutation.type) {
      case ShellMutationType.STAT: {
        // Use the new stat mutation utility for proper handling
        const change = mutateShellStat(shell, mutation.stat, mutation.operation, mutation.amount);

        statChanges[mutation.stat] = change;
        break;
      }

      case ShellMutationType.COMPONENT: {
        // TODO: Implement component mounting/unmounting
        break;
      }

      case ShellMutationType.INVENTORY: {
        // TODO: Implement inventory transfer
        break;
      }

      case ShellMutationType.METADATA: {
        // TODO: Implement shell renaming
        break;
      }
    }
  }

  return events;
};
