import { CommandType, Command, CommandTypeGuard } from '~/types/intent';

/**
 * Helper function to create a command type guard for any command type (system or actor)
 */
export function createCommandGuard<T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  type: T
): CommandTypeGuard<T, A> {
  return (input: any): input is Command<T, A> => {
    return input?.__type === 'command' && input.type === type;
  };
}

// Re-export command handlers
export { MOVE, MoveCommand, MoveCommandArgs } from './MOVE/handler';
export { CREATE_ACTOR, CreateActorCommand as CreateActorCommand } from './CREATE_ACTOR/handler';
export { CREATE_PLACE, CreatePlaceCommand as CreatePlaceCommand } from './CREATE_PLACE/handler';
export { MATERIALIZE_ACTOR, MaterializeActorCommand } from './MATERIALIZE_ACTOR/handler';
export { DEMATERIALIZE_ACTOR, DematerializeActorCommand } from './DEMATERIALIZE_ACTOR/handler';
export { MUTATE_WEATHER, MutateWeatherCommand } from './MUTATE_WEATHER/handler';
export { MUTATE_RESOURCES, MutateResourcesCommand } from './MUTATE_RESOURCES/handler';
