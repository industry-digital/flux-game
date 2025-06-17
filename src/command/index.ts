import { CommandType, AnyCommand, AnyCommandTypeGuard, AllowedInput as BaseAllowedInput } from '@flux';

export type AllowedInput = BaseAllowedInput;

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
  return (input: AllowedInput): input is AnyCommand<T, A> =>
    'type' in input && input.type === type && input.__type === 'command';
}

// Re-export command handlers
export { MOVE, MoveCommand, MoveCommandArgs } from './MOVE/handler';
export { CREATE_ACTOR, CreateActorCommand } from './CREATE_ACTOR/handler';
export { CREATE_PLACE, CreatePlaceCommand } from './CREATE_PLACE/handler';
export { MATERIALIZE_ACTOR, MaterializeActorCommand } from './MATERIALIZE_ACTOR/handler';
export { DEMATERIALIZE_ACTOR, DematerializeActorCommand } from './DEMATERIALIZE_ACTOR/handler';
