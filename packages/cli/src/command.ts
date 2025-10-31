import {
  createIntent,
  executeIntent,
  getTemplatesForLocale,
  parseSessionStrategyFromUrn,
  TransformerContext,
  ActorURN,
  PlaceURN,
  SessionURN,
  Locale,
  TemplateFunction
} from '@flux/core';
import {
  ReplState,
  ReplCommand,
  ReplCommandType,
  ReplResult,
  ReplEffect,
  ReplEffectType,
  CommandDependencies,
} from './types';

// ===== PURE FUNCTIONS (FUNCTIONAL CORE) =====

const getCurrentActorSession = (state: ReplState, deps: CommandDependencies): SessionURN | undefined => {
  return state.currentActor ? deps.getActorSession(state.memo, state.currentActor) : undefined;
};

const getCurrentActorLocation = (state: ReplState, deps: CommandDependencies): PlaceURN | undefined => {
  return state.currentActor ? deps.getActorLocation(state.memo, state.currentActor) : undefined;
};

const SESSION_STARTED_REGEXP = /^(\w+):session:started$/;
const SESSION_ENDED_REGEXP = /^(\w+):session:ended$/;

const updateSessionTracking = (
  state: ReplState,
  events: readonly any[],
  deps: CommandDependencies
): void => {
  if (!state.currentActor) {
    return;
  }

  // Handle session starts and ends
  for (const event of events) {
    const sessionId = event.session || event.payload.sessionId;

    if (SESSION_STARTED_REGEXP.test(event.type)) {
      deps.setActorSession(state.memo, state.currentActor, sessionId);
    }

    if (SESSION_ENDED_REGEXP.test(event.type)) {
      if (deps.getActorSession(state.memo, state.currentActor) === sessionId) {
        deps.removeActorSession(state.memo, state.currentActor);
      }
    }
  }
};

const generateNarrativeEffects = (
  context: TransformerContext,
  events: readonly any[],
  currentActor: ActorURN
): readonly ReplEffect[] => {
  const effects: ReplEffect[] = [];
  const templates = getTemplatesForLocale(Locale.en_US);

  for (const event of events) {
    const template = (templates as any)[event.type] as TemplateFunction<any, any>;
    if (template) {
      const narrative = template(context, event, currentActor);

      if (typeof narrative === 'string' && narrative.trim()) {
        effects.push({ type: ReplEffectType.PRINT, text: narrative + '\n' });
      } else if (Array.isArray(narrative)) {
        effects.push({ type: ReplEffectType.PRINT_SEQUENCE, sequence: narrative });
      }
    }
  }

  return effects;
};


// Direct effect creation functions - zero allocation
const createNoActorContextEffect = (deps: CommandDependencies) =>
  deps.createPrintEffect('No actor context set. Use "actor <id>" first.\n');

const createNoInputEffect = (deps: CommandDependencies) =>
  deps.createPrintEffect('No input provided.\n');

const createCommandFailedEffect = (deps: CommandDependencies, errorCount: number) =>
  deps.createPrintEffect(`✗ Command failed. ${errorCount} error(s) declared.\n`);

const createCommandSuccessEffect = (deps: CommandDependencies) =>
  deps.createPrintEffect('✓ Command executed successfully.\n');

const createUnknownCommandEffect = (deps: CommandDependencies) =>
  deps.createPrintEffect('Unknown command.\n');

const createNotImplementedEffect = (deps: CommandDependencies) =>
  deps.createPrintEffect('Command not yet implemented.\n');

const createPauseInputEffect = (deps: CommandDependencies) =>
  deps.createPauseInputEffect();

const createFlushOutputEffect = (deps: CommandDependencies) =>
  deps.createFlushOutputEffect();

const createResumeInputEffect = (deps: CommandDependencies) =>
  deps.createResumeInputEffect();

const processGameCommand = (
  state: ReplState,
  input: string,
  deps: CommandDependencies,
  output: ReplResult = { newState: state, effects: [] }
): ReplResult => {
  output.newState = state;
  output.effects.length = 0;

  if (!input.trim()) {
    output.effects.push(createNoInputEffect(deps));
    return output;
  }

  if (!state.currentActor || !getCurrentActorLocation(state, deps)) {
    output.effects.push(createNoActorContextEffect(deps));
    return output;
  }

  // Create intent and execute (pure operations)
  const intent = createIntent({
    actor: state.currentActor,
    location: getCurrentActorLocation(state, deps)!,
    session: getCurrentActorSession(state, deps),
    text: input,
  });

  // Clear previous events/errors and execute
  const clearedContext = {
    ...state.context,
    getDeclaredEvents: () => [],
    getDeclaredErrors: () => [],
  };

  const updatedContext = executeIntent(clearedContext, intent);
  const events = updatedContext.getDeclaredEvents();
  const errors = updatedContext.getDeclaredErrors();

  // Update session tracking
  updateSessionTracking(state, events, deps);

  // Generate effects
  const effects: ReplEffect[] = [];

  if (events.length > 0) {
    effects.push(createPauseInputEffect(deps));
    effects.push(...generateNarrativeEffects(updatedContext, events, state.currentActor));
    effects.push(createFlushOutputEffect(deps));
    effects.push(createResumeInputEffect(deps));
  } else if (errors.length > 0) {
    effects.push(createCommandFailedEffect(deps, errors.length));
  } else {
    effects.push(createCommandSuccessEffect(deps));
  }

  return output;
};

const switchActor = (state: ReplState, actorId: ActorURN, deps: CommandDependencies): ReplResult => {
  const actor = state.context.world.actors[actorId];
  if (!actor) {
    return {
      newState: state,
      effects: [{ type: ReplEffectType.PRINT, text: `Actor not found: ${actorId}\n` }]
    };
  }

  // Mutable update for performance
  state.currentActor = actorId;
  deps.setActorLocation(state.memo, actorId, actor.location);

  const currentSession = getCurrentActorSession(state, deps);
  const sessionInfo = currentSession
    ? ` (in ${parseSessionStrategyFromUrn(currentSession)} session)`
    : '';

  return {
    newState: state,
    effects: [{
      type: ReplEffectType.PRINT,
      text: `✓ Switched to actor: ${actor.name} (${actorId})${sessionInfo}\n`
    }]
  };
};

const showContext = (state: ReplState, deps: CommandDependencies): ReplResult => {
  const { world } = state.context;
  const currentSession = getCurrentActorSession(state, deps);
  const sessionDisplay = currentSession
    ? `${parseSessionStrategyFromUrn(currentSession)} (${currentSession})`
    : 'none';

  const contextText = `
Current Context:
  Actor: ${state.currentActor || 'none'}
  Location: ${getCurrentActorLocation(state, deps) || 'none'}
  Session: ${sessionDisplay}

World State:
  Actors: ${Object.keys(world.actors).length}
  Places: ${Object.keys(world.places).length}
  Sessions: ${Object.keys(world.sessions).length}
`;

  return {
    newState: state,
    effects: [{ type: ReplEffectType.PRINT, text: contextText }]
  };
};

const showHelp = (state: ReplState, command?: string): ReplResult => {
  const helpText = command
    ? `No specific help available for '${command}'. Type 'help' for all commands.\n`
    : `
Available Commands:

CLI COMMANDS:
  help [command]      - Show this help
  actor <id>          - Switch to actor context
  context             - Show current context state
  events              - Show declared events
  errors              - Show declared errors
  handlers            - List available command handlers
  sessions            - Show active sessions
  clear               - Clear screen
  exit                - Exit CLI

GAME COMMANDS (via Intent System):
  Any valid game command will be processed through the intent execution pipeline.
  Examples: attack <target>, look, defend, party invite <actor>, etc.

Type any game command to execute it through the intent system.
`;

  return {
    newState: state,
    effects: [{ type: ReplEffectType.PRINT, text: helpText }]
  };
};

// Main command processor (pure function)
export const processCommand = (state: ReplState, command: ReplCommand, deps: CommandDependencies): ReplResult => {
  switch (command.type) {
    case ReplCommandType.GAME_COMMAND:
      return processGameCommand(state, command.input, deps);

    case ReplCommandType.SWITCH_ACTOR:
      return switchActor(state, command.actorId, deps);

    case ReplCommandType.SHOW_HELP:
      return showHelp(state, command.command);

    case ReplCommandType.SHOW_CONTEXT:
      return showContext(state, deps);

    case ReplCommandType.CLEAR_SCREEN:
      return {
        newState: state,
        effects: [{ type: ReplEffectType.CLEAR_SCREEN }]
      };

    case ReplCommandType.EXIT:
      // Mutable update for performance
      state.running = false;
      return {
        newState: state,
        effects: [{ type: ReplEffectType.EXIT_REPL }]
      };

    // TODO: Implement other command types
    case ReplCommandType.SHOW_EVENTS:
    case ReplCommandType.SHOW_ERRORS:
    case ReplCommandType.SHOW_HANDLERS:
    case ReplCommandType.SHOW_SESSIONS:
      return {
        newState: state,
        effects: [createNotImplementedEffect(deps)]
      };

    default:
      return {
        newState: state,
        effects: [createUnknownCommandEffect(deps)]
      };
  }
};

// State utility functions (using mutable updates for performance)
export const getCurrentActor = (state: ReplState): ActorURN | undefined => state.currentActor;

export const getActorSession = (state: ReplState, actorId: ActorURN, deps: CommandDependencies): SessionURN | undefined =>
  deps.getActorSession(state.memo, actorId);
