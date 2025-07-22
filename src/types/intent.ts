import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { InputTypeGuard } from '~/types/handler';

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
  CREATE_PLACE = 'CREATE_PLACE',
  CREATE_ACTOR = 'CREATE_ACTOR',
  MOVE = 'MOVE',
  MATERIALIZE_ACTOR = 'MATERIALIZE_ACTOR',
  DEMATERIALIZE_ACTOR = 'DEMATERIALIZE_ACTOR',
  HOWL = 'HOWL',
  MUTATE_RESOURCES = 'MUTATE_RESOURCES',
  MUTATE_WEATHER = 'MUTATE_WEATHER',
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
   * The actor that issued this command
   */
  actor?: ActorURN;

  /**
   * Optional, non-authoritative location of the actor at the time the command was issued.
   */
  location?: PlaceURN;

  /**
   * The specific type of command
   */
  type: T;

  /**
   * Command-specific arguments
   */
  args: A;
};

/**
 * A fully validated Command with guaranteed fields
 * Safe to execute without additional validation
 */
export type SystemCommand<
  T extends CommandType = CommandType,
  A extends Record<string, any> = Record<string, any>
> =
  & InputMetadata
  & Omit<CommandInput<T, A>, 'id' | 'ts'>
  & {
    /**
     * Guaranteed unique identifier
     */
    id: string;

    /**
     * The moment the command was created; epoch milliseconds
     */
    ts: number;
  };

export type ActorCommandInput<
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>
> =
  & CommandInput<T, A>
  & {

    /**
     * The actor that issued this command
     */
    actor: ActorURN;

    /**
     * The actor's current location
     */
    location?: PlaceURN;
  };

/**
 * A command that is issued by an Actor (i.e., a player character, a non-player character, or a monster)
 */
export type ActorCommand<
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>
> =
  & SystemCommand<T, A>
  & {

    /**
     * The Actor that issued the command
     * A player, NPC, or monster.
     * @example `flux:actor:npc:owain-the-knight`
     */
    actor: ActorURN;

    /**
     * Optional, non-authoritative location of the actor at the time the command was issued.
     * This parameter lets us fetch a place, and all actors within, in a single database roundtrip.
     * It is very easy to verify whether the actor is telling the truth about their location. For example,
     * the actor will not have a representation in the place that they claim to be in.
     *
     * command fails.
     * @example `flux:place:the-breach:barricades:west-gate`
     */
    location?: PlaceURN;
  };

/**
 * Type guard for Commands with specific type and arguments
 */
export type SystemCommandTypeGuard<
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>
> =
  InputTypeGuard<SystemCommand, SystemCommand<T, A>>;

export type ActorCommandTypeGuard<
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>
> =
  InputTypeGuard<ActorCommand<CommandType>, ActorCommand<T, A>>;

/**
 * Union type for any command - either system-issued or actor-issued
 * This provides flexibility for handlers that can work with both types
 */
export type Command<
  T extends CommandType = CommandType,
  A extends Record<string, any> = Record<string, any>
> = SystemCommand<T, A> | ActorCommand<T, A>;

/**
 * Type guard for any command (system or actor) with specific type and arguments
 */
export type CommandTypeGuard<
  T extends CommandType,
  A extends Record<string, any> = Record<string, any>
> =
  InputTypeGuard<Command, Command<T, A>>;
