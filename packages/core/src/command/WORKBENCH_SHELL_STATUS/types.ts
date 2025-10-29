import { ActorCommand, CommandType } from '~/types/intent';

export type AssessShellStatusCommandArgs = {};
export type AssessShellStatusCommand = ActorCommand<CommandType.WORKBENCH_SHELL_STATUS, AssessShellStatusCommandArgs>;
