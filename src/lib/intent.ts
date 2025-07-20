import { randomUUID } from '~/lib/uuid';
import {
  Command,
  CommandInput,
  CommandType,
  SystemCommandTypeGuard,
  InputMetadata,
  ActorCommand
} from '~/types/intent';

const identity = <I, O = I>(x: I): O => x as unknown as O;

export type FactoryOptions = {
  now?: number;
  generateUniqueId?: () => string;
};

type Transformer<I, O = I> = (input: I) => O;
type CommandTransformer = Transformer<Command>;

export const createCommand = <
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>,
>(
  input: CommandInput<T, A>,
  transform: CommandTransformer = identity,
  { now = Date.now(), generateUniqueId: uuid = randomUUID }: FactoryOptions = {},
): Command<T, A> => {
  // Check if this should be an ActorCommand based on presence of actor field
  if ('actor' in input && input.actor) {
    const actorDefaults: ActorCommand<T, A> = {
      __type: 'command',
      id: input.id || uuid(),
      actor: input.actor,
      location: 'location' in input ? input.location : undefined,
      type: input.type,
      ts: input.ts || now,
      args: input.args as A,
    };
    return transform(actorDefaults) as ActorCommand<T, A>;
  } else {
    const systemDefaults: Command<T, A> = {
      __type: 'command',
      id: input.id || uuid(),
      type: input.type,
      ts: input.ts || now,
      args: input.args as A,
    };
    return transform(systemDefaults) as Command<T, A>;
  }
};

/**
 * Type guard to check if input has the command metadata type
 */
export const isCommand = (input: unknown): input is Command => {
  return (
    typeof input === 'object' &&
    input !== null &&
    '__type' in input &&
    (input as InputMetadata).__type === 'command' &&
    'type' in input &&
    'args' in input &&
    'id' in input &&
    'ts' in input
  );
};

export const isActorCommand = (input: unknown): input is ActorCommand<CommandType.CREATE_ACTOR> => {
  return isCommand(input) && typeof input.actor === 'string';
};

/**
 * Type guard to check if input is a CommandInput (before validation)
 */
export const isCommandInput = (input: unknown): input is CommandInput => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    'args' in input &&
    typeof (input as CommandInput).args === 'object' &&
    (input as CommandInput).args !== null &&
    (!('id' in input) || typeof (input as CommandInput).id === 'string') &&
    (!('ts' in input) || typeof (input as CommandInput).ts === 'number')
  );
};

/**
 * Type guard for specific command types with full validation
 */
export const isCommandOfType = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  input: unknown,
  type: T
): input is Command<T, A> => {
  return isCommand(input) && input.type === type;
};

/**
 * Type guard that checks if a validated Command is of a specific type
 */
export const isValidatedCommandOfType = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  input: Command,
  type: T
): input is Command<T, A> => {
  return input.type === type;
};

/**
 * Helper function to create a command type guard
 */
export function createCommandGuard<T extends CommandType, A extends Record<string, any> = {}>(
  type: T
): SystemCommandTypeGuard<T, A> {
  return (input: Command): input is Command<T, A> =>
    'type' in input && input.type === type;
}

/**
 * Factory function to create type-specific command guards
 */
export const createCommandTypeGuard = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  type: T
) => {
  return (input: unknown): input is Command<T, A> => {
    return isCommandOfType(input, type);
  };
};
