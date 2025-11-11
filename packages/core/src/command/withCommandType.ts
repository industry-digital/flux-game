import { Command, CommandType } from '~/types/intent';
import { PureReducer } from '~/types/handler';

/**
 * Higher-order function that wraps a reducer to only execute when the command type matches.
 * Returns context unchanged if the command type doesn't match.
 *
 * This is a critical performance optimization for the transformation stage,
 * preventing handlers from executing on irrelevant commands.
 *
 * @param commandType - The command type this reducer handles
 * @param reducer - The pure reducer to execute when command type matches
 * @returns A wrapped reducer that checks command type before executing
 *
 * @example
 * ```ts
 * const lookReducer = withCommandType(CommandType.LOOK, (context, command) => {
 *   // This only runs for LOOK commands
 *   context.declareEvent({ type: EventType.ACTOR_DID_LOOK, ... });
 *   return context;
 * });
 * ```
 */
export const withCommandType = <C, I extends Command>(
  commandType: CommandType,
  reducer: PureReducer<C, I>
): PureReducer<C, I> => {
  return (context: C, command: I): C => {
    if (command.type !== commandType) {
      return context;
    }

    return reducer(context, command);
  };
};
