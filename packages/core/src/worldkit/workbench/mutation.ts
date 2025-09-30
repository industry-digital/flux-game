import { ShellStat } from '~/types/entity/actor';
import { StatMutationOperation } from '~/types/workbench';
import { ShellMutation, ShellMutationType } from '~/types/workbench';

/**
 * Create a shell stat mutation
 */
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
