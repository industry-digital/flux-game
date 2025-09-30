import { Shell } from '~/types/entity/shell';
import { ShellMutation, ShellMutationType, StatMutation, StatMutationOperation, ValidationResult } from '~/types/workbench';
import { ShellStat } from '~/types/entity/actor';
import { calculateShellStatUpgradeCost } from '../cost';
import { MAX_STAT_VALUE } from '~/worldkit/entity/actor';
import { createShellPreview } from '~/worldkit/workbench/operations/preview';
import { applyShellMutations } from '~/worldkit/workbench/operations/execution';

export const createShellStatMutation = (
  stat: ShellStat,
  operation: StatMutationOperation,
  amount: number,
): ShellMutation => {
  return {
    type: ShellMutationType.STAT,
    stat,
    operation,
    amount,
  };
};

export const validateStatMutation = (
  shell: Shell,
  mutation: StatMutation,
  // Consumers may opt into object re-use
  result: ValidationResult = { ok: false, error: 'DEFAULT_ERROR_MESSAGE' },
): ValidationResult => {
  const currentValue = shell.stats[mutation.stat].eff;
  let targetValue: number;

  if (mutation.operation === StatMutationOperation.ADD) {
    targetValue = currentValue + mutation.amount;
  } else {
    targetValue = currentValue - mutation.amount;
  }

  // Check bounds
  if (targetValue < 0) {
    result.ok = false;
    result.error = `Stat ${mutation.stat} cannot go below 0 (attempted: ${targetValue})`;
    return result;
  }

  if (targetValue > MAX_STAT_VALUE) {
    result.ok = false;
    result.error = `Stat ${mutation.stat} cannot exceed 100 (attempted: ${targetValue})`;
    return result;
  }

  result.ok = true;
  delete result.error
  return result;
}

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
