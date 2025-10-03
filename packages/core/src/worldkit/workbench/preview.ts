import { Shell } from '~/types/entity/shell';
import { ShellMutation, ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { Stat } from '~/types/entity/actor';
import { getNaturalStatValue } from '~/worldkit/entity/stats';

/**
 * Creates a preview of a shell with mutations applied.
 * This is a pure function that doesn't modify the original shell.
 */
export function createShellPreview(currentShell: Shell, mutations: ShellMutation[]): Shell {
  // Create a deep copy of the current shell
  const previewShell: Shell = {
    id: currentShell.id,
    name: currentShell.name,
    stats: {
      [Stat.POW]: { ...currentShell.stats[Stat.POW] },
      [Stat.FIN]: { ...currentShell.stats[Stat.FIN] },
      [Stat.RES]: { ...currentShell.stats[Stat.RES] },
    },
    inventory: {
      ...currentShell.inventory,
      items: { ...currentShell.inventory.items }
    },
    equipment: { ...currentShell.equipment },
  };

  // Apply all mutations to the preview
  for (const mutation of mutations) {
    switch (mutation.type) {
      case ShellMutationType.STAT: {
        const currentValue = getNaturalStatValue(previewShell, mutation.stat);
        let newValue: number;

        if (mutation.operation === StatMutationOperation.ADD) {
          newValue = currentValue + mutation.amount;
        } else {
          newValue = Math.max(0, currentValue - mutation.amount); // Prevent negative stats
        }

        previewShell.stats[mutation.stat].eff = newValue;
        break;
      }

      case ShellMutationType.COMPONENT: {
        // TODO: Implement component mounting/unmounting preview
        break;
      }

      case ShellMutationType.INVENTORY: {
        // TODO: Implement inventory transfer preview
        break;
      }

      case ShellMutationType.METADATA: {
        previewShell.name = mutation.newName;
        break;
      }
    }
  }

  return previewShell;
}
