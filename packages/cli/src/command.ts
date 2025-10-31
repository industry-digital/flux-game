import {
  getTemplatesForLocale,
  parseSessionStrategyFromUrn,
  TransformerContext,
  ActorURN,
  PlaceURN,
  SessionURN,
  Locale,
  TemplateFunction,
  Intent,
} from '@flux/core';
import {
  ReplState,
  ReplCommand,
  ReplCommandType,
  ReplEffect,
  ReplEffectType,
  CommandDependencies,
  AddEffectCallback,
} from './types';
import { createPrintEffect } from '~/effect';

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

export type ProcessGameCommandDependencies = CommandDependencies & {
  createIntent: (input: any) => Intent;
};

const PREALLOCATED_RESUME_INPUT_EFFECT: ReplEffect = { type: ReplEffectType.RESUME_INPUT };
const PREALLOCATED_FLUSH_OUTPUT_EFFECT: ReplEffect = { type: ReplEffectType.FLUSH_OUTPUT };
const PREALLOCATED_PAUSE_INPUT_EFFECT: ReplEffect = { type: ReplEffectType.PAUSE_INPUT };
const PREALLOCATED_PRINT_NO_INPUT_PROVIDED_EFFECT: ReplEffect = { type: ReplEffectType.PRINT, text: 'No input provided.\n' };

const processGameCommand = (
  state: ReplState,
  input: string,
  trace: string,
  addEffect: AddEffectCallback,
  deps: ProcessGameCommandDependencies,
): void => {

  if (!input.trim()) {
    addEffect(PREALLOCATED_PRINT_NO_INPUT_PROVIDED_EFFECT);
    return;
  }

  const actorLocation = getCurrentActorLocation(state, deps);

  if (!state.currentActor || !actorLocation) {
    addEffect({ type: ReplEffectType.PRINT, text: 'No actor context set. Use "actor <id>" first.\n' });
    return;
  }

  const actorSession = getCurrentActorSession(state, deps);

  // Create intent and execute (pure operations)
  const intent = deps.createIntent({
    id: trace, // Use CLI-generated trace as intent ID
    actor: state.currentActor,
    location: actorLocation,
    session: actorSession,
    text: input,
  });

  // Clear previous events/errors and execute
  state.context.resetEvents();
  state.context.resetErrors();

  const updatedContext = deps.executeIntent(state.context, intent);
  const events = updatedContext.getDeclaredEvents();
  const errors = updatedContext.getDeclaredErrors();

  // Update state with new context (mutable update for performance)
  state.context = updatedContext;

  // Update session tracking
  updateSessionTracking(state, events, deps);

  // Generate effects
  if (events.length > 0) {
    addEffect(PREALLOCATED_PAUSE_INPUT_EFFECT);
    const narrativeEffects = generateNarrativeEffects(updatedContext, events, state.currentActor);
    for (const effect of narrativeEffects) {
      addEffect(effect);
    }
    addEffect(PREALLOCATED_FLUSH_OUTPUT_EFFECT);
    addEffect(PREALLOCATED_RESUME_INPUT_EFFECT);
  } else if (errors.length > 0) {
    addEffect({ type: ReplEffectType.PRINT, text: `✗ Command failed. ${errors.length} error(s) declared.\n` });
  } else {
    addEffect({ type: ReplEffectType.PRINT, text: '✓ Command executed successfully.\n' });
  }
};

const switchActor = (state: ReplState, actorId: ActorURN, addEffect: (effect: ReplEffect) => void, deps: CommandDependencies): void => {
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

const showContext = (state: ReplState, addEffect: AddEffectCallback, deps: CommandDependencies): void => {
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

const showEvents = (state: ReplState, addEffect: AddEffectCallback, deps: CommandDependencies): void => {
  const events = state.context.getDeclaredEvents();

  if (events.length === 0) {
    addEffect({ type: ReplEffectType.PRINT, text: 'No events declared.\n' });
    return;
  }

  let eventsText = `\nDeclared Events (${events.length}):\n`;
  for (const event of events) {
    const location = event.location ? ` @ ${event.location}` : '';
    const actor = event.actor ? ` [${event.actor}]` : '';
    eventsText += `  ${event.type}${location}${actor} - ${event.trace || 'no trace'}\n`;
  }

  addEffect(createPrintEffect(eventsText));
};

const showErrors = (state: ReplState, addEffect: (effect: ReplEffect) => void, deps: CommandDependencies): void => {
  const errors = state.context.getDeclaredErrors();

  if (errors.length === 0) {
    addEffect({ type: ReplEffectType.PRINT, text: 'No errors declared.\n' });
    return;
  }

  let errorsText = `\nDeclared Errors (${errors.length}):\n`;
  for (const error of errors) {
    errorsText += `\n  ${error.trace ?? 'no trace'}: ${error.code} + ${error.stack}\n`;
  }

  addEffect({ type: ReplEffectType.PRINT, text: errorsText });
};

const AVAILABLE_COMMANDS_TEXT = `
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

const PREALLOCATED_PRINT_AVAILABLE_COMMANDS_EFFECT: ReplEffect = { type: ReplEffectType.PRINT, text: AVAILABLE_COMMANDS_TEXT + '\n' };

const showHelp = (state: ReplState, command: string | undefined, addEffect: AddEffectCallback): void => {
  if (command) {
    addEffect(createPrintEffect(`No specific help available for '${command}'. Type 'help' for all commands.\n`));
  } else {
    addEffect(PREALLOCATED_PRINT_AVAILABLE_COMMANDS_EFFECT);
  }
};

const PREALLOCATED_CLEAR_SCREEN_EFFECT: ReplEffect = { type: ReplEffectType.CLEAR_SCREEN };
const PREALLOCATED_EXIT_REPL_EFFECT: ReplEffect = { type: ReplEffectType.EXIT_REPL };
const PREALLOCATED_PRINT_COMMAND_NOT_IMPLEMENTED_EFFECT: ReplEffect = { type: ReplEffectType.PRINT, text: 'Command not yet implemented.\n' };
const PREALLOCATED_PRINT_UNKNOWN_COMMAND_EFFECT: ReplEffect = { type: ReplEffectType.PRINT, text: 'Unknown command.\n' };

// Main command processor - mutation-based for zero allocations
export const processCommand = (
  state: ReplState,
  command: ReplCommand,
  effects: ReplEffect[],
  deps: ProcessGameCommandDependencies,
): void => {
  effects.length = 0;

  let effectIndex = 0;

  const addEffect = (effect: ReplEffect): void => {
    effects[effectIndex++] = effect;
  };

  switch (command.type) {
    case ReplCommandType.GAME_COMMAND:
      processGameCommand(state, command.input, command.trace, addEffect, deps);
      break;

    case ReplCommandType.SWITCH_ACTOR:
      switchActor(state, command.actorId, addEffect, deps);
      break;

    case ReplCommandType.SHOW_HELP:
      showHelp(state, command.command, addEffect);
      break;

    case ReplCommandType.SHOW_CONTEXT:
      showContext(state, addEffect, deps);
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
      showEvents(state, addEffect, deps);
      break;

    case ReplCommandType.SHOW_ERRORS:
      showErrors(state, addEffect, deps);
      break;

    case ReplCommandType.SHOW_HANDLERS:
    case ReplCommandType.SHOW_SESSIONS:
      addEffect(PREALLOCATED_PRINT_COMMAND_NOT_IMPLEMENTED_EFFECT);
      break;

    default:
      addEffect(PREALLOCATED_PRINT_UNKNOWN_COMMAND_EFFECT);
      break;
  }
};
