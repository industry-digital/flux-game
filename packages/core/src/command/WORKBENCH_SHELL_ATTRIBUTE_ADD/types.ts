import { ActorCommand, CommandType } from '~/types/intent';
import { StatMutation } from '~/types/workbench';

export type AddShellAttributeCommandArgs = StatMutation;
export type AddShellAttributeCommand = ActorCommand<CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD, AddShellAttributeCommandArgs>;
