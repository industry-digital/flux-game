import { AbstractSession, SessionStrategy } from '~/types/session';
import { ShellStat } from '~/types/entity/actor';
import { ComponentSchemaURN, ItemURN } from '~/types/taxonomy';
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
  schema: ComponentSchemaURN;
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
  pendingMutations: ShellMutation[];
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

export type Change = `${number} -> ${number}`;
export type NoChange = `${number}`;
export type DiffValue = Change | NoChange;

export type StatChanges = Partial<Record<ShellStat, DiffValue>>;

export type ShellDiff = {
  shellId: string;
  /**
   * Cost in resources
   */
  cost: number;
  /**
   * Stat changes
   */
  stats?: StatChanges;
  /**
   * Performance changes
   */
  perf: PerformanceChanges;
};

export type PerformanceChanges = {

  /**
   * Gap closing time in seconds
   * Short distance is about ~10 meters
   */
  gapClosing10: DiffValue;

  /**
   * Gap closing time in seconds
   * Long distance is about ~100 meters
   */
  gapClosing100: DiffValue;

  /**
   * Average speed in meters per second
   * Short distance is about ~10 meters
   */
  avgSpeed10: DiffValue;

  /**
   * Average speed in meters per second
   * Long distance is about ~100 meters
   */
  avgSpeed100: DiffValue;

  /**
   * Peak power output in watts
   */
  peakPowerOutput: DiffValue;

  /**
   * Component power draw in watts
   */
  componentPowerDraw: DiffValue;

  /**
   * Free power in watts (peakPowerOut - componentPowerDraw)
   */
  freePower: DiffValue;

  // === COMBAT EFFECTIVENESS ===

  /**
   * Damage per second (damage / AP cost)
   */
  weaponDps: DiffValue;

  /**
   * Weapon damage per strike
   */
  weaponDamage: DiffValue;

  /**
   * Action Point cost per weapon strike
   */
  weaponApCost: DiffValue;

  // === PHYSICAL CHARACTERISTICS ===

  /**
   * Total shell mass in kilograms (body + equipment + inventory)
   */
  totalMassKg: DiffValue;

  /**
   * Effective mass for acceleration calculations (reduced by FIN)
   */
  inertialMassKg: DiffValue;

  /**
   * Inertia reduction percentage from finesse (0-61.8%)
   */
  inertiaReduction: DiffValue;

  /**
   * Power-to-weight ratio (watts per kg)
   */
  powerToWeightRatio: DiffValue;

  /**
   * Maximum theoretical speed in m/s
   */
  topSpeed: DiffValue;

  /**
   * Maximum energy capacity in Joules
   */
  capacitorCapacity: DiffValue;

  /**
   * Maximum energy recovery rate in Watts (at t=~0.382)
   */
  maxRechargeRate: DiffValue;
};
