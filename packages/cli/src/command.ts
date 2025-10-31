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
  ReplEffect,
  ReplEffectType,
  CommandDependencies,
} from './types';

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
        effects.push({ type: ReplEffectType.PRINT, text: `📖 ${narrative}\n` });
      } else if (Array.isArray(narrative)) {
        effects.push({ type: ReplEffectType.PRINT_SEQUENCE, sequence: narrative });
      }
    }
  }

  return effects;
};


const processGameCommand = (
  state: ReplState,
  input: string,
  trace: string,
  deps: CommandDependencies,
  addEffect: (effect: ReplEffect) => void
): void => {
  if (!input.trim()) {
    addEffect(deps.createPrintEffect('No input provided.\n'));
    return;
  }

  if (!state.currentActor || !getCurrentActorLocation(state, deps)) {
    addEffect(deps.createPrintEffect('No actor context set. Use "actor <id>" first.\n'));
    return;
  }

  // Create intent and execute (pure operations)
  const intent = createIntent({
    id: trace, // Use CLI-generated trace as intent ID
    actor: state.currentActor,
    location: getCurrentActorLocation(state, deps)!,
    session: getCurrentActorSession(state, deps),
    text: input,
  });

  // Clear previous events/errors and execute
  state.context.resetEvents();
  state.context.resetErrors();

  const updatedContext = executeIntent(state.context, intent);
  const events = updatedContext.getDeclaredEvents();
  const errors = updatedContext.getDeclaredErrors();

  // Update state with new context (mutable update for performance)
  state.context = updatedContext;

  // Update session tracking
  updateSessionTracking(state, events, deps);

  // Generate effects
  if (events.length > 0) {
    addEffect(deps.createPauseInputEffect());
    const narrativeEffects = generateNarrativeEffects(updatedContext, events, state.currentActor);
    for (const effect of narrativeEffects) {
      addEffect(effect);
    }
    addEffect(deps.createFlushOutputEffect());
    addEffect(deps.createResumeInputEffect());
  } else if (errors.length > 0) {
    addEffect(deps.createPrintEffect(`✗ Command failed. ${errors.length} error(s) declared.\n`));
  } else {
    addEffect(deps.createPrintEffect('✓ Command executed successfully.\n'));
  }
};

const switchActor = (state: ReplState, actorId: ActorURN, deps: CommandDependencies, addEffect: (effect: ReplEffect) => void): void => {
  const actor = state.context.world.actors[actorId];
  if (!actor) {
    addEffect({ type: ReplEffectType.PRINT, text: `Actor not found: ${actorId}\n` });
    return;
  }

  // Mutable update for performance
  state.currentActor = actorId;
  deps.setActorLocation(state.memo, actorId, actor.location);

  const currentSession = getCurrentActorSession(state, deps);
  const sessionInfo = currentSession
    ? ` (in ${parseSessionStrategyFromUrn(currentSession)} session)`
    : '';

  addEffect({
    type: ReplEffectType.PRINT,
    text: `✓ Switched to actor: ${actor.name} (${actorId})${sessionInfo}\n`
  });
};

const showContext = (state: ReplState, deps: CommandDependencies, addEffect: (effect: ReplEffect) => void): void => {
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

  addEffect({ type: ReplEffectType.PRINT, text: contextText });
};

const showEvents = (state: ReplState, deps: CommandDependencies, addEffect: (effect: ReplEffect) => void): void => {
  const events = state.context.getDeclaredEvents();

  if (events.length === 0) {
    addEffect(deps.createPrintEffect('No events declared.\n'));
    return;
  }

  let eventsText = `\nDeclared Events (${events.length}):\n`;
  for (const event of events) {
    const location = event.location ? ` @ ${event.location}` : '';
    const actor = event.actor ? ` [${event.actor}]` : '';
    eventsText += `  ${event.type}${location}${actor} - ${event.trace || 'no trace'}\n`;
  }

  addEffect(deps.createPrintEffect(eventsText));
};

const showErrors = (state: ReplState, deps: CommandDependencies, addEffect: (effect: ReplEffect) => void): void => {
  const errors = state.context.getDeclaredErrors();

  if (errors.length === 0) {
    addEffect(deps.createPrintEffect('No errors declared.\n'));
    return;
  }

  let errorsText = `\nDeclared Errors (${errors.length}):\n`;
  for (const error of errors) {
    errorsText += `\n  ${error.trace ?? 'no trace'}: ${error.code} + ${error.stack}\n`;
  }

  addEffect(deps.createPrintEffect(errorsText));
};

const showHelp = (state: ReplState, command: string | undefined, addEffect: (effect: ReplEffect) => void): void => {
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

  addEffect({ type: ReplEffectType.PRINT, text: helpText });
};

const PREALLOCATED_CLEAR_SCREEN_EFFECT: ReplEffect = { type: ReplEffectType.CLEAR_SCREEN };
const PREALLOCATED_EXIT_REPL_EFFECT: ReplEffect = { type: ReplEffectType.EXIT_REPL };

// Main command processor - mutation-based for zero allocations
export const processCommand = (
  state: ReplState,
  command: ReplCommand,
  deps: CommandDependencies,
  effects: ReplEffect[],
): void => {
  effects.length = 0;

  let effectIndex = 0;

  const addEffect = (effect: ReplEffect): void => {
    effects[effectIndex++] = effect;
  };

  switch (command.type) {
    case ReplCommandType.GAME_COMMAND:
      processGameCommand(state, command.input, command.trace, deps, addEffect);
      break;

    case ReplCommandType.SWITCH_ACTOR:
      switchActor(state, command.actorId, deps, addEffect);
      break;

    case ReplCommandType.SHOW_HELP:
      showHelp(state, command.command, addEffect);
      break;

    case ReplCommandType.SHOW_CONTEXT:
      showContext(state, deps, addEffect);
      break;

    case ReplCommandType.CLEAR_SCREEN:
      addEffect(PREALLOCATED_CLEAR_SCREEN_EFFECT);
      break;

    case ReplCommandType.EXIT:
      // Direct state mutation for performance
      state.running = false;
      addEffect(PREALLOCATED_EXIT_REPL_EFFECT);
      break;

    case ReplCommandType.SHOW_EVENTS:
      showEvents(state, deps, addEffect);
      break;

    case ReplCommandType.SHOW_ERRORS:
      showErrors(state, deps, addEffect);
      break;

    case ReplCommandType.SHOW_HANDLERS:
    case ReplCommandType.SHOW_SESSIONS:
      addEffect(deps.createPrintEffect('Command not yet implemented.\n'));
      break;

    default:
      addEffect(deps.createPrintEffect('Unknown command.\n'));
      break;
  }
};

// State utility functions (using mutable updates for performance)
export const getCurrentActor = (state: ReplState): ActorURN | undefined => state.currentActor;

export const getActorSession = (state: ReplState, actorId: ActorURN, deps: CommandDependencies): SessionURN | undefined =>
  deps.getActorSession(state.memo, actorId);

/*

effects.push(...);

// versus
effects[i] = ...;

*/
