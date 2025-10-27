import { ActorCommand, CommandType } from '~/types/intent';

export type ListShellsCommandArgs = {};
export type ListShellsCommand = ActorCommand<CommandType.WORKBENCH_SHELL_LIST, ListShellsCommandArgs>;
