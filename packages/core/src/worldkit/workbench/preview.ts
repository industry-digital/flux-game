import { Shell } from '~/types/entity/shell';
import { ShellMutation, ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { getShellNaturalStatValue, setShellStatValue, cloneShell } from '~/worldkit/entity/actor/shell';


/**
 * Creates a preview of a shell with mutations applied.
 * This is a pure function that doesn't modify the original shell.
 */
export function createShellPreview(currentShell: Shell, mutations: ShellMutation[]): Shell {
  const previewShell = cloneShell(currentShell);

  // Apply all mutations to the preview
  for (const mutation of mutations) {
    switch (mutation.type) {
      case ShellMutationType.STAT: {
        const currentValue = getShellNaturalStatValue(previewShell, mutation.stat);
        let newValue: number;

        if (mutation.operation === StatMutationOperation.ADD) {
          newValue = currentValue + mutation.amount;
        } else {
          newValue = Math.max(0, currentValue - mutation.amount); // Prevent negative stats
        }

        setShellStatValue(previewShell, mutation.stat, newValue);
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
