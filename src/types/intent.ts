import { MoveCommandArgs } from '~/command/MOVE/handler';
import { PlaceInput } from '~/types/entity/place';
import { ActorInput } from '~/types/entity/actor';
import { ActorURN, EntityURN, PlaceURN } from '~/types/taxonomy';
import { ExecutionError, InputTypeGuard } from '~/types/handler';

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
  CREATE_ACTOR = 'CREATE_ACTOR',
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
   * The actor that issued this command
   */
  actor?: ActorURN;

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

  /**
   * The actor's current location
   */
  location?: PlaceURN;
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
   * The moment the command was created; epoch milliseconds
   */
  ts: number;

  /**
   * The world actor that issued the command.
   * This is always populated if the command is issued by one of:
   *   - a player character
   *   - a non-player character
   *  - a monster
   */
  actor?: ActorURN;

  /**
   * The location of the actor at the time the command was issued
   */
  location?: PlaceURN;

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
   * The location of the actor at the time the intent was issued
   */
  location?: PlaceURN;

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
 * Type guard for Commands with specific type and arguments
 */
export type CommandTypeGuard<T extends CommandType, A extends Record<string, any> = {}> =
  InputTypeGuard<AbstractCommand, AbstractCommand<T, A>>;

export type Command =
| AbstractCommand<CommandType.UNRESOLVED_COMMAND, any>
| AbstractCommand<CommandType.CREATE_PLACE, PlaceInput>
| AbstractCommand<CommandType.MOVE, MoveCommandArgs>
| AbstractCommand<CommandType.CREATE_ACTOR, ActorInput>;
