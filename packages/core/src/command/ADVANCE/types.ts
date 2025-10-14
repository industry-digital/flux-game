import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type AdvanceCommandArgs = {
  type?: 'distance' | 'ap'; // Type of advance movement
  distance?: number; // Distance to move (in meters)
  direction?: number; // Direction to move (1 = forward, -1 = backward)
  target?: ActorURN; // Target to advance toward (alternative to distance)
};

export type AdvanceCommand = ActorCommand<CommandType.ADVANCE, AdvanceCommandArgs>;
