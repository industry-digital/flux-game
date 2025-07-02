import { CommandType, AnyCommand, AnyCommandTypeGuard } from '@flux';

/**
 * A utility type for creating command type guards
 * Uses our new flexible AnyCommand system
 */
export type CommandTypeGuard<T extends CommandType, A extends Record<string, any> = Record<string, any>> =
  AnyCommandTypeGuard<T, A>;

/**
 * Helper function to create a command type guard for any command type (system or actor)
 */
export function createCommandGuard<T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  type: T
): CommandTypeGuard<T, A> {
  return (input: any): input is AnyCommand<T, A> => {
    return input?.__type === 'command' && input.type === type;
  };
}

// Re-export command handlers
export { MOVE, MoveCommand, MoveCommandArgs } from './MOVE/handler';
export { CREATE_ACTOR, CreateActorCommand } from './CREATE_ACTOR/handler';
export { CREATE_PLACE, CreatePlaceCommand } from './CREATE_PLACE/handler';
export { MATERIALIZE_ACTOR, MaterializeActorCommand } from './MATERIALIZE_ACTOR/handler';
export { DEMATERIALIZE_ACTOR, DematerializeActorCommand } from './DEMATERIALIZE_ACTOR/handler';
