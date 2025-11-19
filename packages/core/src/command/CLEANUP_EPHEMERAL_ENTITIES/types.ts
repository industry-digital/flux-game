import { CommandType, SystemCommand } from '~/types/intent';

export type CleanupEphemeralEntitiesCommandArgs = {};

export type CleanupEphemeralEntitiesCommand = SystemCommand<CommandType.CLEANUP_EPHEMERAL_ENTITIES, CleanupEphemeralEntitiesCommandArgs>;
