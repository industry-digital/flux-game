import { ActorCommand, CommandType } from '~/types/intent';

export type AdvanceCommandArgs =
  | { type: 'max' } // Move as far as possible until AP exhausted or collision
  | { type: 'distance'; distance: number } // Move specific distance in meters
  | { type: 'ap'; ap: number }; // Move using specific AP amount

export type AdvanceCommand = ActorCommand<CommandType.ADVANCE, AdvanceCommandArgs>;
