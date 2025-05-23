import { Command, CommandType, Intent } from '~/types';

export type AllowedInput = Command | Intent;

/**
 * A utility type for creating command type guards
 * Makes it easier to implement the 'handles' method in handlers
 */
export type CommandTypeGuard<T extends CommandType, A extends Record<string, any>> =
  (input: Command) => input is Command<T, A>;

  /**
 * Helper function to create a command type guard
 */
export function createCommandGuard<T extends CommandType, A extends Record<string, any> = {}>(
  type: T
): CommandTypeGuard<T, A> {
  return (input: AllowedInput): input is Command<T, A> =>
    'type' in input && input.type === type;
}
