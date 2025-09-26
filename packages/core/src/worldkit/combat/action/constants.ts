import { CommandType } from '~/types/intent';

export const CHANCE_ACTIONS: Partial<Record<CommandType, 1>> = {
  // Removed STRIKE - chance actions no longer terminate planning
  // This allows multiple consecutive STRIKE actions for aggressive combat
} as const;

export const PLAN_ENDING_ACTIONS: Partial<Record<CommandType, 1>> = {
  [CommandType.DEFEND]: 1,
} as const;

export const MOVEMENT_ACTIONS: Partial<Record<CommandType, 1>> = {
  [CommandType.ADVANCE]: 1,
  [CommandType.RETREAT]: 1,
  [CommandType.DASH]: 1,
} as const;
