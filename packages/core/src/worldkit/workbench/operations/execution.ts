import { Shell } from '~/types/entity/shell';
import { ShellMutation, ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { WorldEvent } from '~/types/event';

/**
 * Applies shell mutations to the shell
 */
export const applyShellMutations = (shell: Shell, mutations: ShellMutation[]): WorldEvent[] => {
  const events: WorldEvent[] = [];
  const statChanges: Record<string, { from: number; to: number }> = {};

  for (const mutation of mutations) {
    switch (mutation.type) {
      case ShellMutationType.STAT: {
        const currentValue = shell.stats[mutation.stat].eff;
        let newValue: number;

        if (mutation.operation === StatMutationOperation.ADD) {
          newValue = currentValue + mutation.amount;
        } else {
          newValue = Math.max(0, currentValue - mutation.amount);
        }

        // Record the change for events
        statChanges[mutation.stat] = { from: currentValue, to: newValue };

        // Apply the change to the shell
        shell.stats[mutation.stat].eff = newValue;
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
