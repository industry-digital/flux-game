import { ActorCommand, CommandType } from '~/types/intent';

export type AdvanceCommandArgs = {
  type?: 'distance' | 'ap'; // Type of advance movement
  distance?: number; // Distance to move (in meters) - undefined means max possible
  direction?: number; // Direction to move (1 = forward, -1 = backward)
};

export type AdvanceCommand = ActorCommand<CommandType.ADVANCE, AdvanceCommandArgs>;
