import { TransformerContext, ActorURN, PlaceURN, SessionURN, NarrativeSequence, WorldScenarioHook } from '@flux/core';
import type { ReadLine } from 'readline';

export type ParsedInput = {
  tokens: string[];
  command: string;
  args: string[];
  raw?: string;  // Optional: original input for validation
};

export type ActorMemo = {
  actorSessions: Map<ActorURN, SessionURN>;
  actorLocations: Map<ActorURN, PlaceURN>;
};

export type ReplMemo = {
  actors: ActorMemo;
};

export type ReplState = {
  context: TransformerContext;
  scenario: WorldScenarioHook;
  currentActor?: ActorURN;
  memo: ReplMemo;  // Back to concrete type
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

export type ReplCommand =
  | { readonly type: ReplCommandType.GAME_COMMAND; readonly input: string }
  | { readonly type: ReplCommandType.SWITCH_ACTOR; readonly actorId: ActorURN }
  | { readonly type: ReplCommandType.SHOW_HELP; readonly command?: string }
  | { readonly type: ReplCommandType.SHOW_CONTEXT }
  | { readonly type: ReplCommandType.SHOW_EVENTS }
  | { readonly type: ReplCommandType.SHOW_ERRORS }
  | { readonly type: ReplCommandType.SHOW_HANDLERS }
  | { readonly type: ReplCommandType.SHOW_SESSIONS }
  | { readonly type: ReplCommandType.CLEAR_SCREEN }
  | { readonly type: ReplCommandType.EXIT };

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

export type ReplRuntime = {
  rl: ReadLine;
  output: ReplOutputInterface;
};

export type ReplOutputInterface = {
  print: (text: string) => void;
};

export type ReplStateDependencies = {
  createWorldScenario: (context: TransformerContext) => WorldScenarioHook;
};

// Memo operations interface
export type MemoOperations = {
  getActorSession: (memo: ReplMemo, actorId: ActorURN) => SessionURN | undefined;
  getActorLocation: (memo: ReplMemo, actorId: ActorURN) => PlaceURN | undefined;
  setActorSession: (memo: ReplMemo, actorId: ActorURN, sessionId: SessionURN) => void;
  removeActorSession: (memo: ReplMemo, actorId: ActorURN) => void;
  setActorLocation: (memo: ReplMemo, actorId: ActorURN, location: PlaceURN) => void;
};

// Effect creation interface
export type EffectCreators = {
  createPrintEffect: (text: string) => ReplEffect;
  createPauseInputEffect: () => ReplEffect;
  createResumeInputEffect: () => ReplEffect;
  createFlushOutputEffect: () => ReplEffect;
};

// Command processing dependencies
export type CommandDependencies = {
  memo: MemoOperations;
  effects: EffectCreators;
};

export type ReplCommandResolver = (input: string) => ReplCommand;
