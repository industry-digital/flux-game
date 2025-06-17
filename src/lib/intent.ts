import { randomUUID } from '~/lib/uuid';
import {
  SystemCommand,
  CommandInput,
  CommandType,
  SystemCommandTypeGuard,
  InputMetadata,
  Intent,
  NaturalLanguageAnalysis,
  ActorCommand,
  AnyCommand,
} from '~/types/intent';
import { ActorURN, EntityURN } from '~/types/taxonomy';
import { uniqid } from '~/lib/random';

const identity = <I, O = I>(x: I): O => x as unknown as O;

export type FactoryOptions = {
  now?: number;
  generateUniqueId?: () => string;
};

type Transformer<I, O = I> = (input: I) => O;

type IntentTransformer = Transformer<Intent>;

export const createIntentFromText = (
  nlp: (text: string) => any,
  self: EntityURN,
  text: string,
  transform: IntentTransformer = identity,
  { now = Date.now(), generateUniqueId = uniqid }: FactoryOptions = {},
): Intent => {
  const nlpAnalysis = createNaturalLanguageAnalysis(nlp, text);

  const defaults: Partial<Intent> = {
    __type: 'intent',
    id: generateUniqueId(),
    ts: now,
    actor: self,
    text,
    nlp: nlpAnalysis,
  };

  return transform(defaults as Intent) as Intent;
};

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

export const createCommandFromIntent = <T extends CommandType>(
  intent: Intent,
  transform: CommandTransformer,
  { now = Date.now() }: FactoryOptions = {},
): ActorCommand<T> => {
  const defaults: Partial<ActorCommand<T>> = {
    __type: 'command',
    id: intent.id,
    ts: now,
    actor: intent.actor as ActorURN,
    location: intent.location,
  };

  return transform(defaults as ActorCommand<T>) as ActorCommand<T>;
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
