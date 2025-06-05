import { MoveCommandArgs } from '~/command/MOVE';
import { PlaceDefinition } from '~/lib/entity/util';
import { CharacterInput } from '~/types/entity/character';
import { EntityURN } from '~/types/taxonomy';
import { ExecutionError } from '~/types/handler';

export type InputMetadata = { __type: 'command' | 'intent' };

/**
 * Base type for command types
 * Exported as 'any' to allow consumers to override with their own enum or union types
 * via declaration merging
 */
export enum CommandType {
  /**
   * Represents an unresolved command that could not be processed
   * If an Intent cannot be converted to an actual Command, we still pass this UNRESOLVED_COMMAND
   * through the pipeline so that all stages have an opportunity to act.
   */
  UNRESOLVED_COMMAND = 'UNRESOLVED_COMMAND',
  CREATE_PLACE = 'CREATE_PLACE',
  CREATE_CHARACTER = 'CREATE_CHARACTER',
  MOVE = 'MOVE',
}

/**
 * Input format for commands coming from clients
 * This is the shape of data before validation and processing
 */
export type CommandInput<
  T extends CommandType = CommandType,
  A extends Record<string, any> = Record<string, any>,
> = {
  /**
   * Globally unique identifier for the intent. This propagates through the system as `trace`.
   */
  id?: string;

  /**
   * Timestamp when the command was issued (milliseconds since epoch)
   */
  ts?: number;

  /**
   * The specific type of command
   */
  type: T;

  /**
   * Command-specific arguments
   */
  args: A;
}

/**
 * A fully validated Command with guaranteed fields
 * Safe to execute without additional validation
 */
export type AbstractCommand<
  T extends CommandType = CommandType,
  A extends Record<string, any> = Record<string, any>
> = InputMetadata & Omit<CommandInput<T, A>, 'id' | 'ts'> & {
  /**
   * Guaranteed unique identifier
   */
  id: string;

  /**
   * The moment the command was created
   */
  ts: number;

  /**
   * The entity that issued this command
   */
  actor: EntityURN;

  /**
   * Indicates if this command failed during execution.
   * This allows the command to continue propagating through the pipeline
   * while carrying its failure state.
   */
  failed?: boolean;

  /**
   * Errors encountered during execution, if any.
   * Present when failed=true.
   */
  errors?: ExecutionError[];
}

/**
 * Serializable NLP analysis results from processing the intent text
 */
export type NaturalLanguageAnalysis = {
  verbs: string[];
  nouns: string[];
  adjectives: string[];
};

/**
 * Input format for text-based intents from users
 * Represents natural language input before parsing
 */
export type IntentInput = {
  /**
   * Globally unique identifier for the intent. This propagates through the system as `trace`.
   */
  id?: string;

  /**
   * Optional timestamp when the intent was issued
   */
  ts?: number;

  /**
   * The entity that issued this intent
   */
  actor: EntityURN;

  /**
   * The raw text input from the user
   */
  text: string;

  /**
   * Optional NLP analysis results from processing the text
   */
  nlp?: NaturalLanguageAnalysis;
};

/**
 * A fully validated Intent with guaranteed fields
 */
export type Intent = InputMetadata & Omit<IntentInput, 'id' | 'ts' | 'nlp'> & {
  id: string;
  ts: number;
  nlp: NaturalLanguageAnalysis;
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
    'ts' in input &&
    'actor' in input &&
    (!('failed' in input) || typeof (input as AbstractCommand).failed === 'boolean') &&
    (!('errors' in input) || Array.isArray((input as AbstractCommand).errors))
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
 * Factory function to create type-specific command guards
 */
export const createCommandTypeGuard = <T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  type: T
) => {
  return (input: unknown): input is AbstractCommand<T, A> => {
    return isCommandOfType(input, type);
  };
};

/**
 * Example usage with your MOVE command:
 */
export const isMoveCommand = createCommandTypeGuard(CommandType.MOVE);

// Or inline:
export const isMoveCommandInline = (input: unknown): input is AbstractCommand<CommandType.MOVE> => {
  return isCommandOfType(input, CommandType.MOVE);
};

export type Command =
| AbstractCommand<CommandType.UNRESOLVED_COMMAND, any>
| AbstractCommand<CommandType.CREATE_PLACE, PlaceDefinition>
| AbstractCommand<CommandType.MOVE, MoveCommandArgs>
| AbstractCommand<CommandType.CREATE_CHARACTER, CharacterInput>;

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
