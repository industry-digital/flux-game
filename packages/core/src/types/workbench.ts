import { AbstractSession, SessionStrategy } from '~/types/session';
import { ShellStat } from '~/types/entity/actor';
import { ItemURN } from '~/types/taxonomy';
import { Shell } from '~/types/entity/shell';
import { WorldEvent } from '~/types/event';
import { ShellPerformanceProfile } from '~/types/shell';

/**
 * Discriminated union of all possible shell mutations
 */
export type ShellMutation =
  | StatMutation
  | ComponentMutation
  | InventoryMutation
  | RenameShellMutation;

export enum ShellMutationType {
  STAT = 'stat',
  COMPONENT = 'component',
  INVENTORY = 'inventory',
  METADATA = 'metadata',
}

export enum StatMutationOperation {
  ADD = 'add',
  REMOVE = 'remove',
}

/**
 * Shell stat modification (POW, FIN, RES)
 */
export type StatMutation = {
  type: ShellMutationType.STAT;
  stat: ShellStat;
  operation: StatMutationOperation;
  amount: number;
};

export enum ComponentMutationOperation {
  MOUNT = 'mount',
  UNMOUNT = 'unmount',
}

/**
 * Shell components are Items that can be mounted to the shell, like peripherals on a computer
 */
export type ComponentMutation = {
  type: ShellMutationType.COMPONENT;
  operation: ComponentMutationOperation;
  componentId: ItemURN;
};

export enum InventoryOperationType {
  TRANSFER_FROM_SHELL_TO_VAULT = 'transfer:shell:vault',
  TRANSFER_FROM_VAULT_TO_SHELL = 'transfer:vault:shell',
}

/**
 * Inventory transfers between shell and vault
 */
export type InventoryMutation = {
  type: ShellMutationType.INVENTORY;
  operation: InventoryOperationType;
  itemId: ItemURN;
  quantity: number;
};

/**
 * Shell metadata changes (rename, etc.)
 */
export type RenameShellMutation = {
  type: ShellMutationType.METADATA;
  newName: string;
};

export type WorkbenchSessionData = {
  currentShellId: string;
  pendingChanges: ShellMutation[];
};

export type WorkbenchSession = AbstractSession<SessionStrategy.WORKBENCH, WorkbenchSessionData>;

export type ValidationResult =
| { ok: true; error?: string }
| { ok: false; error: string };

// Staging API - Pure, side-effect free
export type ShellMutationStagingApi = {
  validateMutation: (shell: Shell, mutation: ShellMutation) => ValidationResult;
  calculateMutationCost: (shell: Shell, mutation: ShellMutation) => number;
  previewMutation: (shell: Shell, mutation: ShellMutation) => Shell;
  calculateTotalCost: (shell: Shell, mutations: ShellMutation[]) => number;
  previewAllMutations: (shell: Shell, mutations: ShellMutation[]) => Shell;
};

// Execution API - Effectful, modifies world state
export type ShellMutationExecutionApi = {
  applyMutations: (shell: Shell, mutations: ShellMutation[]) => WorldEvent[];
  rollbackMutations: (shell: Shell, mutations: ShellMutation[]) => void;
};

export type ShellPreview = {
  shell: Shell;
  perf: ShellPerformanceProfile;
};
