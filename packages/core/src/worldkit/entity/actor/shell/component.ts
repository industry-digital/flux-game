import { ShellComponent } from '~/types/entity/item';
import { Shell } from '~/types/entity/shell';

const SHELL_COMPONENT_SCHEMA_URN_REGEX = /^flux:schema:component:.*$/;

export const getMountedComponents = (
  shell: Shell,
  output: ShellComponent[],
): ShellComponent[] => {
  output.length = 0;

  for (const itemId in shell.inventory.items) {
    const item = shell.inventory.items[itemId];
    if (item.schema.startsWith('flux:schema:component:')) {
      output.push(item as ShellComponent);
    }
  }

  return output;
};
