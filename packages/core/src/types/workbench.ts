import { AbstractSession, AbstractSessionData, SessionStrategy } from '~/types/session';
import { ActorStat } from '~/types/entity/actor';
import { ItemURN } from '~/types/taxonomy';

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
  stat: ActorStat.POW | ActorStat.FIN | ActorStat.RES;
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

export enum InventoryMutationOperation {
  TRANSFER_FROM_SHELL_TO_VAULT = 'transfer:shell:vault',
  TRANSFER_FROM_VAULT_TO_SHELL = 'transfer:vault:shell',
}

/**
 * Inventory transfers between shell and vault
 */
export type InventoryMutation = {
  type: ShellMutationType.INVENTORY;
  operation: InventoryMutationOperation;
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

export type WorkbenchSessionData = AbstractSessionData<SessionStrategy.WORKBENCH> & {
  currentShellId: string;
  pendingChanges: ShellMutation[];
};

export type WorkbenchSession = AbstractSession<SessionStrategy.WORKBENCH, WorkbenchSessionData>;
