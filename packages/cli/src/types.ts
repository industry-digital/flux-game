import { TransformerContext, ActorURN, PlaceURN, SessionURN, NarrativeSequence, WorldScenarioHook } from '@flux/core';
import type { ReadLine } from 'readline';

export type ParsedInput = {
  tokens: string[];
  command: string;
  args: string[];
  raw?: string;  // Optional: original input for validation
};

export type ActorMemo = {
  sessions: Map<ActorURN, SessionURN>;
  locations: Map<ActorURN, PlaceURN>;
};

export type ReplMemo = {
  actors: ActorMemo;
};

export type ReplState = {
  context: TransformerContext;
  scenario: WorldScenarioHook;
  currentActor?: ActorURN;
  memo: ReplMemo;
  running: boolean;
};

export enum ReplCommandType {
  GAME_COMMAND = 'GAME_COMMAND',
  SWITCH_ACTOR = 'SWITCH_ACTOR',
  SHOW_HELP = 'SHOW_HELP',
  SHOW_CONTEXT = 'SHOW_CONTEXT',
  SHOW_EVENTS = 'SHOW_EVENTS',
  SHOW_ERRORS = 'SHOW_ERRORS',
  SHOW_HANDLERS = 'SHOW_HANDLERS',
  SHOW_SESSIONS = 'SHOW_SESSIONS',
  CLEAR_SCREEN = 'CLEAR_SCREEN',
  EXIT = 'EXIT',
}

// Base command with trace information
export type ReplCommandBase = {
  readonly trace: string; // Thread trace through entire command lifecycle
};

export type ReplCommand = ReplCommandBase & (
  | { readonly type: ReplCommandType.GAME_COMMAND; readonly input: string }
  | { readonly type: ReplCommandType.SWITCH_ACTOR; readonly actorId: ActorURN }
  | { readonly type: ReplCommandType.SHOW_HELP; readonly command?: string }
  | { readonly type: ReplCommandType.SHOW_CONTEXT }
  | { readonly type: ReplCommandType.SHOW_EVENTS }
  | { readonly type: ReplCommandType.SHOW_ERRORS }
  | { readonly type: ReplCommandType.SHOW_HANDLERS }
  | { readonly type: ReplCommandType.SHOW_SESSIONS }
  | { readonly type: ReplCommandType.CLEAR_SCREEN }
  | { readonly type: ReplCommandType.EXIT }
);

export enum ReplEffectType {
  PRINT = 'PRINT',
  PRINT_SEQUENCE = 'PRINT_SEQUENCE',
  PAUSE_INPUT = 'PAUSE_INPUT',
  RESUME_INPUT = 'RESUME_INPUT',
  FLUSH_OUTPUT = 'FLUSH_OUTPUT',
  CLEAR_SCREEN = 'CLEAR_SCREEN',
  EXIT_REPL = 'EXIT_REPL',
}

export type ReplEffect =
  | { readonly type: ReplEffectType.PRINT; readonly text: string }
  | { readonly type: ReplEffectType.PRINT_SEQUENCE; readonly sequence: NarrativeSequence }
  | { readonly type: ReplEffectType.PAUSE_INPUT }
  | { readonly type: ReplEffectType.RESUME_INPUT }
  | { readonly type: ReplEffectType.FLUSH_OUTPUT }
  | { readonly type: ReplEffectType.CLEAR_SCREEN }
  | { readonly type: ReplEffectType.EXIT_REPL };

export type ReplResult = {
  newState: ReplState;
  effects: ReplEffect[];
};

// Mutation-based command processor - pure function that mutates effects array
export type MutableCommandProcessor = (
  state: ReplState,
  command: ReplCommand,
  deps: CommandDependencies,
  effects: ReplEffect[]
) => void;

export type ReplRuntime = {
  rl: ReadLine;
  output: ReplOutputInterface;
};

export type ReplOutputInterface = {
  print: (text: string) => void;
};


// Command processing dependencies - flattened structure
export type CommandDependencies = {
  // Memo operations
  getActorSession: (memo: ReplMemo, actorId: ActorURN) => SessionURN | undefined;
  getActorLocation: (memo: ReplMemo, actorId: ActorURN) => PlaceURN | undefined;
  setActorSession: (memo: ReplMemo, actorId: ActorURN, sessionId: SessionURN) => void;
  removeActorSession: (memo: ReplMemo, actorId: ActorURN) => void;
  setActorLocation: (memo: ReplMemo, actorId: ActorURN, location: PlaceURN) => void;

  // Effect creators
  createPrintEffect: (text: string) => ReplEffect;
  createPauseInputEffect: () => ReplEffect;
  createResumeInputEffect: () => ReplEffect;
  createFlushOutputEffect: () => ReplEffect;
};

export type ReplCommandResolver = (input: string) => ReplCommand;

export type InputProcessor = (input: ParsedInput, trace: string, output?: ParsedInput) => ParsedInput | ReplCommand;
export type InputPipeline = readonly InputProcessor[];

export type ScenarioResolver = (
  context: TransformerContext,
  setCurrentActor: (actorId: ActorURN) => void,
) => WorldScenarioHook;
