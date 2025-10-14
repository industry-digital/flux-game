import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type RetreatCommandArgs = {
  type?: 'distance' | 'ap'; // Type of retreat movement
  distance?: number; // Distance to move (in meters)
  direction?: number; // Direction to move (always -1 for retreat)
  target?: ActorURN; // Target to retreat from (alternative to distance)
};

export type RetreatCommand = ActorCommand<CommandType.RETREAT, RetreatCommandArgs>;
