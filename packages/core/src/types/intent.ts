import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { EntityResolverApi } from '~/intent/resolvers';
import { ErrorDeclarationProducer, TransformerContext } from '~/types/handler';

export type InputMetadata = { __type: 'command' | 'intent' };

/**
 * Base type for command types
 * Exported as 'any' to allow consumers to override with their own enum or union types
 * via declaration merging
 */
export enum CommandType {
  ADVANCE = 'ADVANCE',
  EQUIP = 'EQUIP',
  ATTACK = 'ATTACK',
  CHARGE = 'CHARGE',
  CLEAVE = 'CLEAVE',
  CREATE_ACTOR = 'CREATE_ACTOR',
  CREATE_PLACE = 'CREATE_PLACE',
  CREDIT = 'CREDIT',
  DASH = 'DASH',
  DEBIT = 'DEBIT',
  DEFEND = 'DEFEND',
  DEMATERIALIZE_ACTOR = 'DEMATERIALIZE_ACTOR',
  DONE = 'DONE',
  MOVE = 'MOVE',
  MUTATE_RESOURCES = 'MUTATE_RESOURCES',
  MUTATE_WEATHER = 'MUTATE_WEATHER',
  LOOK = 'LOOK',
  MATERIALIZE_ACTOR = 'MATERIALIZE_ACTOR',
  RANGE = 'RANGE',
  RETREAT = 'RETREAT',
  SOMERSAULT = 'SOMERSAULT',
  STRIKE = 'STRIKE',
  TARGET = 'TARGET',
  TRAVEL = 'TRAVEL',
  VAULT = 'VAULT',
  UNEQUIP = 'UNEQUIP',
  USE_WORKBENCH = 'USE_WORKBENCH',
  PARTY_INVITE= 'PARTY_INVITE',
  PARTY_ACCEPT = 'PARTY_ACCEPT',
  PARTY_REJECT = 'PARTY_REJECT',
  PARTY_LEAVE = 'PARTY_LEAVE',
  PARTY_DISBAND = 'PARTY_DISBAND',
  PARTY_LIST = 'PARTY_LIST',
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
   * If this command is part of a session, the session ID
   */
  session?: SessionURN;

  /**
   * Optional trace identifier for command chaining and causality tracking.
   * When a command spawns other commands, this field maintains the causal chain.
   * If not provided, the command's own ID becomes the trace.
   */
  trace?: string;

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
  & Omit<CommandInput<T, A>, 'id' | 'ts' | 'actor'>
  & {
    /**
     * Guaranteed unique identifier
     */
    id: string;

    /**
     * The moment the command was created; epoch milliseconds
     */
    ts: number;

    /**
     * System actor URN
     * At runtime, the system assigns a value like `flux:actor:system`
     * We type this as ActorURN to avoid type impedance problems during development.
     * @example `flux:actor:system`
     */
    actor: ActorURN;

    /**
     * Optional trace identifier for command chaining and causality tracking.
     * When a command spawns other commands, this field maintains the causal chain.
     * If not provided, the command's own ID becomes the trace.
     */
    trace?: string;
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
  & InputMetadata
  & Omit<CommandInput<T, A>, 'id' | 'ts' | 'actor'>
  & {
    /**
     * Guaranteed unique identifier; inherited from intent
     */
    id: string;

    /**
     * The moment the command was created; epoch milliseconds
     */
    ts: number;

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

    /**
     * Optional trace identifier for command chaining and causality tracking.
     * When a command spawns other commands, this field maintains the causal chain.
     */
    trace?: string;
  };

/**
 * Union type for any command - either system-issued or actor-issued
 * This provides flexibility for handlers that can work with both types
 */
export type Command<
  T extends CommandType = CommandType,
  A extends Record<string, any> = Record<string, any>
> = SystemCommand<T, A> | ActorCommand<T, A>;

export type CommandResolverContext =
  & TransformerContext
  & ErrorDeclarationProducer
  & EntityResolverApi;

export type CommandResolver<TCommand extends Command = Command> = (
  context: CommandResolverContext,
  input: Intent
) => TCommand | undefined;

export type IntentOptions = undefined | Record<string, string | number | boolean>;

export type Intent<TOptions extends IntentOptions = undefined> = {
  id: string;
  /**
   * The moment the intent was created; epoch milliseconds
   */
  ts: number;
  actor: ActorURN;
  location: PlaceURN;
  session?: SessionURN;
  /**
   * Raw string input from the user
   */
  text: string;
  /**
   * Downcased and trimmed string input from the user
   */
  normalized: string;

  /**
   * The first token of the intent
   */
  verb: string;

  /**
   * Tokens created from `normalized`, unsorted
   * Does not contain `verb`.
   */
  tokens: string[];

  /**
   * Unique tokens created from `normalized`
   * Does not contain `verb`.
   */
  uniques: Set<string>;

  /**
   * Key-value options that occur *after* the verb.
   * Parsed from `--key` or `--key=value` syntax.
   */
  options: TOptions;
};
