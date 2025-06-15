import { randomUUID } from '~/lib/uuid';
import { AbstractCommand, CommandInput, CommandType, CommandTypeGuard, InputMetadata, Intent, NaturalLanguageAnalysis } from '~/types/intent';
import { ActorURN, EntityURN } from '~/types/taxonomy';

const identity = <I, O = I>(x: I): O => x as unknown as O;

export type FactoryOptions = {
  now?: number;
  uuid?: () => string;
};

type Transformer<I, O = I> = (input: I) => O;

type IntentTransformer = Transformer<Intent>;

export const createIntentFromText = (
  nlp: (text: string) => any,
  self: EntityURN,
  text: string,
  transform: IntentTransformer = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): Intent => {
  const nlpAnalysis = createNaturalLanguageAnalysis(nlp, text);

  const defaults: Partial<Intent> = {
    __type: 'intent',
    id: uuid(),
    ts: now,
    actor: self,
    text,
    nlp: nlpAnalysis,
  };

  return transform(defaults as Intent) as Intent;
};

type CommandTransformer = Transformer<AbstractCommand>;

export const createCommand = <
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>,
>(
  input: CommandInput<T, A>,
  transform: CommandTransformer = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): AbstractCommand <T> => {
  const defaults: AbstractCommand<T, A> = {
    __type: 'command',
    id: input.id || uuid(),
    actor: input.actor,
    type: input.type,
    ts: input.ts || now,
    args: input.args as A,
  };

  return transform(defaults as AbstractCommand<T, A>)  as AbstractCommand<T, A>;
};

export const createCommandFromIntent = <T extends CommandType>(
  actor: ActorURN,
  intent: Intent,
  transform: CommandTransformer,
  { now = Date.now() }: FactoryOptions = {},
): AbstractCommand<T> => {
  const defaults: Partial<AbstractCommand<T>> = {
    __type: 'command',
    id: intent.id,
    ts: now,
    actor: actor,
  };

  return transform(defaults as AbstractCommand<T>) as AbstractCommand<T>;
};

export const createNaturalLanguageAnalysis = (
  nlp: (text: string) => any,
  text: string
): NaturalLanguageAnalysis => {
  const doc = nlp(text);

  return {
    verbs: doc.verbs().out('array'),
    nouns: doc.nouns().out('array'),
    adjectives: doc.adjectives().out('array'),
  };
};

/**
 * Higher-order function that wraps any command type guard to ignore failed commands.
 * Useful when a handler only wants to process commands that haven't failed.
 */
export const ignoreFailedCommands = <T extends AbstractCommand>(
  guard: (input: unknown) => input is T
) => {
  return (input: unknown): input is T => {
    return guard(input) && !input.failed;
  };
};

/**
 * Type guard to check if input has the command metadata type
 */
export const isCommand = (input: unknown): input is AbstractCommand => {
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

/**
 * Type guard to check if input has the intent metadata type
 */
export const isIntent = (input: unknown): input is Intent => {
  return (
    typeof input === 'object' &&
    input !== null &&
    '__type' in input &&
    (input as InputMetadata).__type === 'intent' &&
    'text' in input &&
    'id' in input &&
    'ts' in input &&
    'actor' in input &&
    (!('nlp' in input) || typeof (input as Intent).nlp === 'object')
  );
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
): input is AbstractCommand<T, A> => {
  return isCommand(input) && input.type === type;
};

/**
 * Type guard that checks if a validated Command is of a specific type
 */
export const isValidatedCommandOfType = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  input: AbstractCommand,
  type: T
): input is AbstractCommand<T, A> => {
  return input.type === type;
};

/**
 * Helper function to create a command type guard
 */
export function createCommandGuard<T extends CommandType, A extends Record<string, any> = {}>(
  type: T
): CommandTypeGuard<T, A> {
  return (input: AbstractCommand): input is AbstractCommand<T, A> =>
    'type' in input && input.type === type;
}

/**
 * Factory function to create type-specific command guards
 */
export const createCommandTypeGuard = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  type: T
) => {
  return (input: unknown): input is AbstractCommand<T, A> => {
    return isCommandOfType(input, type);
  };
};
