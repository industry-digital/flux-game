import { ActorCommand, CommandType } from '~/types/intent';

export type RenameShellCommandArgs = {
  newName: string;
  shellNameOrId?: string;
};

export type RenameShellCommand = ActorCommand<CommandType.WORKBENCH_SHELL_RENAME, RenameShellCommandArgs>;
