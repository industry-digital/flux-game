import { randomUUID } from '~/lib/uuid';
import {
  SystemCommand,
  CommandInput,
  CommandType,
  SystemCommandTypeGuard,
  InputMetadata,
  ActorCommand,
  AnyCommand,
} from '~/types/intent';

const identity = <I, O = I>(x: I): O => x as unknown as O;

export type FactoryOptions = {
  now?: number;
  generateUniqueId?: () => string;
};

type Transformer<I, O = I> = (input: I) => O;
type CommandTransformer = Transformer<AnyCommand>;

export const createCommand = <
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>,
>(
  input: CommandInput<T, A>,
  transform: CommandTransformer = identity,
  { now = Date.now(), generateUniqueId: uuid = randomUUID }: FactoryOptions = {},
): AnyCommand<T, A> => {
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
    const systemDefaults: SystemCommand<T, A> = {
      __type: 'command',
      id: input.id || uuid(),
      type: input.type,
      ts: input.ts || now,
      args: input.args as A,
    };
    return transform(systemDefaults) as SystemCommand<T, A>;
  }
};

/**
 * Type guard to check if input has the command metadata type
 */
export const isCommand = (input: unknown): input is SystemCommand => {
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

export const isActorCommand = (input: unknown): input is SystemCommand<CommandType.CREATE_ACTOR> => {
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
): input is SystemCommand<T, A> => {
  return isCommand(input) && input.type === type;
};

/**
 * Type guard that checks if a validated Command is of a specific type
 */
export const isValidatedCommandOfType = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  input: SystemCommand,
  type: T
): input is SystemCommand<T, A> => {
  return input.type === type;
};

/**
 * Helper function to create a command type guard
 */
export function createCommandGuard<T extends CommandType, A extends Record<string, any> = {}>(
  type: T
): SystemCommandTypeGuard<T, A> {
  return (input: SystemCommand): input is SystemCommand<T, A> =>
    'type' in input && input.type === type;
}

/**
 * Factory function to create type-specific command guards
 */
export const createCommandTypeGuard = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  type: T
) => {
  return (input: unknown): input is SystemCommand<T, A> => {
    return isCommandOfType(input, type);
  };
};
