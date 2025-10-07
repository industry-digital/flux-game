import { ActorURN } from '~/types/taxonomy';
import { BASE62_CHARSET, uniqid as uniqidImpl } from '~/lib/random';
import {
  Command,
  CommandInput,
  CommandType,
  SystemCommandTypeGuard,
  ActorCommand,
  SystemCommand,
} from '~/types/intent';

const identity = <I, O = I>(x: I): O => x as unknown as O;

export type CommandFactoryDependencies = {
  timestamp: () => number;
  uniqid: () => string;
};

type Transformer<I, O = I> = (input: I) => O;
type CommandTransformer = Transformer<Command>;

export const DEFAULT_COMMAND_FACTORY_DEPS: CommandFactoryDependencies = {
  timestamp: () => Date.now(),
  uniqid: () => uniqidImpl(24, BASE62_CHARSET),
};

/**
 * Creates an ActorCommand from CommandInput
 */
export const createActorCommand = <
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>,
>(
  input: CommandInput<T, A> & { actor: ActorURN },
  transform: CommandTransformer = identity,
  deps: CommandFactoryDependencies = DEFAULT_COMMAND_FACTORY_DEPS,
): ActorCommand<T, A> => {
  const actorDefaults: ActorCommand<T, A> = {
    __type: 'command',
    id: input.id || deps.uniqid(),
    actor: input.actor,
    location: input.location,
    type: input.type,
    ts: input.ts || deps.timestamp(),
    args: input.args as A,
    trace: input.trace,
  };
  return transform(actorDefaults) as ActorCommand<T, A>;
};

/**
 * Creates a SystemCommand from CommandInput
 */
export const createSystemCommand = <
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>,
>(
  input: Omit<CommandInput<T, A>, 'actor'> & { actor?: `flux:sys:${string}` },
  transform: CommandTransformer = identity,
  deps: CommandFactoryDependencies = DEFAULT_COMMAND_FACTORY_DEPS,
): SystemCommand<T, A> => {
  const systemDefaults: SystemCommand<T, A> = {
    __type: 'command',
    id: input.id || deps.uniqid(),
    actor: input.actor || ('flux:sys:server' as const),
    type: input.type,
    ts: input.ts || deps.timestamp(),
    args: input.args as A,
    location: input.location,
    trace: input.trace,
  };
  return transform(systemDefaults) as SystemCommand<T, A>;
};

/**
 * @deprecated Use createActorCommand or createSystemCommand instead
 * Creates a Command from CommandInput - defaults to ActorCommand behavior
 */
export const createCommand = <
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>,
>(
  input: CommandInput<T, A>,
  transform: CommandTransformer = identity,
  deps: CommandFactoryDependencies = DEFAULT_COMMAND_FACTORY_DEPS,
): Command<T, A> => {
  return createActorCommand(input as CommandInput<T, A> & { actor: ActorURN }, transform, deps);
};

/**
 * Type guard for specific command types with full validation
 */
export const isCommandOfType = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  input: unknown,
  type: T
): input is Command<T, A> => {
  return (input as Command<T, A>)?.type === type;
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
  return (input: SystemCommand): input is SystemCommand<T, A> =>
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
