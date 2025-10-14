import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type AttackCommandArgs = {
  target: ActorURN;
};

export type AttackCommand = ActorCommand<CommandType.ATTACK, AttackCommandArgs>;
