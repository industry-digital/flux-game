import { ActorCommand, CommandType } from '~/types/intent';

export type SwapShellCommandArgs = {
  targetShellNameOrId: string;
};

export type SwapShellCommand = ActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>;
