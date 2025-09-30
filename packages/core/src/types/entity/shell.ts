import { Actor, ShellStats } from '~/types/entity/actor';

export type Shell = {
  id: string;
  /**
   * The name of the shell (player-assigned).
   */
  name: string;
  stats: ShellStats;
  inventory: Actor['inventory'];
  equipment: Actor['equipment'];
};

export type ShellPreview = Shell & {

  previewStats: ShellStats;
  previewInventory: Actor['inventory'];
  previewEquipment: Actor['equipment'];

};
