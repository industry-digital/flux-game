import { ActorCommand, CommandType } from '~/types/intent';

export type SwapShellCommandArgs = {
  targetShellId: string;
};

export type SwapShellCommand = ActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>;
