/**
 * Flux Game Engine CLI/REPL
 *
 * Interactive command-line interface for testing and development.
 * Supports the full intent execution pipeline and workbench operations.
 */

import * as readline from 'readline';
import { createTransformerContext } from '~/worldkit/context';
import { createIntent, executeIntent, getAvailableHandlers } from '~/intent';
import { TransformerContext } from '~/types/handler';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';
import { createDefaultWorldScenario } from '~/testing/scenarios/default';
import { getTemplatesForLocale } from '~/narrative';
import { Locale } from '~/types/i18n';
import { NarrativeSequence, TemplateFunction } from '~/types';
import { WorldScenarioHook } from '~/worldkit/scenario';
import { ALICE_ID } from '~/testing/constants';
import { parseSessionStrategyFromUrn } from '~/worldkit/session';
import { BatchSchedulingOutput } from '~/repl/output';


// Actor state tracking
type ActorTracker = {
  sessions: Map<ActorURN, SessionURN>;
  locations: Map<ActorURN, PlaceURN>;
};

// CLI State
type CliState = {
  context: TransformerContext;
  scenario: WorldScenarioHook;
  currentActor?: ActorURN;
  actors: ActorTracker;
  running: boolean;
};

const context = createTransformerContext();
const defaultScenario = createDefaultWorldScenario(context);

// Initialize CLI state with default actor context
const state: CliState = {
  context,
  scenario: defaultScenario,
  currentActor: ALICE_ID,
  actors: {
    sessions: new Map(),
    locations: new Map(),
  },
  running: true,
};

const SESSION_STARTED_REGEXP = /^(combat|workbench):session:started/;
const SESSION_ENDED_REGEXP = /^(combat|workbench):session:ended/;

const output = new BatchSchedulingOutput();

function print(text: string): void {
  output.print(text);
}

/**
 * Session management functions
 */
function updateSessionTracking(): void {
  if (!state.currentActor) return;

  // Check for session start events
  const sessionStartEvents = state.context.getDeclaredEvents(SESSION_STARTED_REGEXP);

  // Handle all session start events (workbench, combat, etc.)
  for (const event of sessionStartEvents) {
    if ('sessionId' in event.payload && event.payload.sessionId) {
      const sessionId = event.payload.sessionId;
      state.actors.sessions.set(state.currentActor, sessionId);
    }
  }

  // Check for session end events
  const sessionEndEvents = state.context.getDeclaredEvents(SESSION_ENDED_REGEXP);

  // Handle session ends
  for (const event of sessionEndEvents) {
    if ('sessionId' in event.payload && event.payload.sessionId) {
      const sessionId = event.payload.sessionId;

      // Remove actor from this session if they were in it
      if (state.actors.sessions.get(state.currentActor) === sessionId) {
        state.actors.sessions.delete(state.currentActor);
      }

      // Session type is encoded in URN, no cleanup needed
    }
  }
}

function getCurrentActorSession(): SessionURN | undefined {
  if (!state.currentActor) return undefined;
  return state.actors.sessions.get(state.currentActor);
}

function getSessionType(sessionId: SessionURN): string {
  return parseSessionStrategyFromUrn(sessionId);
}

function getCurrentActorLocation(): PlaceURN | undefined {
  if (!state.currentActor) return undefined;
  return state.actors.locations.get(state.currentActor);
}

function updateActorLocation(actorId: ActorURN, location: PlaceURN): void {
  state.actors.locations.set(actorId, location);
}

// Initialize actor locations from the world state
function initializeActorLocations(): void {
  for (const [actorId, actor] of Object.entries(state.context.world.actors)) {
    state.actors.locations.set(actorId as ActorURN, actor.location);
  }
}

// Initialize on startup
initializeActorLocations();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

/**
 * Display welcome message and basic help
 */
function showWelcome(): void {
  print(`
╔══════════════════════════════════════════════════════════════════╗
║                    Flux Game Engine CLI/REPL                     ║
║                                                                  ║
║  Interactive command-line interface for testing and development  ║
║  Type 'help' for available commands or 'exit' to quit            ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

function countKeysInPlainObject(obj: object): number {
  let output = 0;
  for (let _ in obj) {
    output++;
  }
  return output;
}

/**
 * Show current context state
 */
function showContext(): void {
  const { world } = state.context;
  const currentSession = getCurrentActorSession();
  const sessionDisplay = currentSession ? `${getSessionType(currentSession)} (${currentSession})` : 'none';

  print(`
Current Context:
  Actor: ${state.currentActor || 'none'}
  Location: ${getCurrentActorLocation() || 'none'}
  Session: ${sessionDisplay}

World State:
  Actors: ${countKeysInPlainObject(world.actors)}
  Places: ${countKeysInPlainObject(world.places)}
  Sessions: ${countKeysInPlainObject(world.sessions)}
`);
}

/**
 * Show declared events
 */
function showEvents(): void {
  const events = state.context.getDeclaredEvents();
  if (events.length === 0) {
    print('No events declared.');
    return;
  }

  print(`\nDeclared Events (${events.length}):`);
  for (const event of events) {
    print(`  ${event.type} - ${event.trace || 'no trace'}`);
  }
}

/**
 * Show declared errors
 */
function showErrors(): void {
  const errors = state.context.getDeclaredErrors();
  if (errors.length === 0) {
    print('No errors declared.');
    return;
  }

  print(`\nDeclared Errors (${errors.length}):`);
  for (const error of errors) {
    print(`  ${error.code || 'unknown'} - ${error.trace || 'no trace'}`);
  }
}

/**
 * Display help information
 */
function showHelp(command?: string): void {
  if (command) {
    print(`No specific help available for '${command}'. Type 'help' for all commands.`);
    return;
  }

  print(`
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
`);
}

/**
 * Load a predefined scenario
 */
function loadScenario(scenarioName: string): void {
  print(`Scenario loading not yet implemented: ${scenarioName}`);
}

/**
 * Create a new actor
 */
function createActor(name: string): void {
  print(`Actor creation not yet implemented: ${name}`);
}

/**
 * Switch to a different actor context
 */
function switchActor(actorId: string): void {
  const actor = state.context.world.actors[actorId as ActorURN];
  if (!actor) {
    print(`Actor not found: ${actorId}`);
    return;
  }

  const previousActor = state.currentActor;
  state.currentActor = actorId as ActorURN;
  updateActorLocation(actorId as ActorURN, actor.location);

  const currentSession = getCurrentActorSession();
  const sessionInfo = currentSession ? ` (in ${getSessionType(currentSession)} session)` : '';

  print(`✓ Switched to actor: ${actor.name} (${actorId})${sessionInfo}`);

  if (previousActor && currentSession) {
    print(`  Session context maintained from previous commands.`);
  }
}

/**
 * Show available command handlers
 */
function showHandlers(): void {
  print(`\nAvailable Command Handlers (${PURE_GAME_LOGIC_HANDLERS.length}):`);

  const handlers = getAvailableHandlers();
  for (const handler of handlers) {
    // Try to get the command type from the handler
    const handlerName = handler.constructor.name;
    print(`  ${handlerName}`);
  }
}

/**
 * Show session information
 */
function showSessions(): void {
  print('\nSession Information:');

  if (state.actors.sessions.size === 0) {
    print('  No active sessions.');
    return;
  }

  print('  Active Sessions:');
  for (const [actorId, sessionId] of state.actors.sessions) {
    const sessionType = getSessionType(sessionId);
    const isCurrent = actorId === state.currentActor ? ' (current)' : '';
    print(`    ${actorId}: ${sessionType} session ${sessionId}${isCurrent}`);
  }
}

/**
 * Render a narrative sequence with timed delays
 */
async function renderNarrativeSequence(sequence: NarrativeSequence): Promise<void> {
  for (const item of sequence) {
    if (item.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, item.delay));
    }
    if (item.text.trim()) {
      print(item.text);
    }
  }
  print(''); // Add final newline after sequence
}

/**
 * Execute a game command via the intent system
 */
async function executeGameCommand(input: string): Promise<void> {
  if (!state.currentActor || !getCurrentActorLocation()) {
    print('No actor context set. Use "actor <id>" or load a scenario first.');
    return;
  }

  try {
    // Clear any previously accumulated events and errors to prevent overlap
    state.context.resetEvents();
    state.context.resetErrors();

    // Get current session for this actor (if any)
    const currentSession = getCurrentActorSession();

    // Get current location
    const currentLocation = getCurrentActorLocation();
    if (!currentLocation) {
      print('No location set for current actor.');
      return;
    }

    // Create intent from input, threading the session ID
    const intent = createIntent({
      actor: state.currentActor,
      location: currentLocation,
      session: currentSession, // ← Thread the session ID!
      text: input,
    });

    // Execute intent through the pipeline
    const updatedContext = executeIntent(state.context, intent);

    // Update state with new context
    state.context = updatedContext;

    // Update session tracking based on declared events
    updateSessionTracking();

    // Show any events or errors that were declared
    const events = state.context.getDeclaredEvents();
    const errors = state.context.getDeclaredErrors();

    if (events.length > 0) {

      // Generate and display narrative for each event
      const templates = getTemplatesForLocale(Locale.en_US);
      for (const event of events) {
        const template = templates[event.type] as TemplateFunction<any, any>;
        if (template && state.currentActor) {
          const narrative = template(state.context, event, state.currentActor);
          if (typeof narrative === 'string') {
            if (narrative.trim()) {
              print(`📖 ${narrative}\n`);
            }
           } else if (Array.isArray(narrative)) {
             // Block input until the narrative sequence is done rendering
             const sequence: NarrativeSequence = narrative;
             await renderNarrativeSequence(sequence);
           }
        }
      }
    } else if (errors.length > 0) {
      print(`✗ Command failed. ${errors.length} error(s) declared.`);
      showErrors();
    } else {
      print('✓ Command executed successfully.');
    }

  } catch (error) {
    console.error(`✗ Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process a single command line input
 */
async function processCommand(input: string): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;

  const [command, ...args] = trimmed.split(/\s+/);

  switch (command.toLowerCase()) {
    case 'help':
      showHelp(args[0]);
      break;

    case 'scenario':
      if (args.length === 0) {
        print('Usage: scenario <name>');
        print('Available: combat-basic, workbench-simple, party-test');
      } else {
        loadScenario(args[0]);
      }
      break;

    case 'create':
      if (args.length < 2) {
        print('Usage: create <type> <name>');
        print('Types: actor, place');
      } else if (args[0] === 'actor') {
        createActor(args.slice(1).join(' '));
      } else {
        print(`Unknown create type: ${args[0]}`);
      }
      break;

    case 'actor':
      if (args.length === 0) {
        print('Usage: actor <id>');
        print(`Available actors: ${Object.keys(state.context.world.actors).join(', ')}`);
      } else {
        switchActor(args[0]);
      }
      break;

    case 'context':
      showContext();
      break;

    case 'events':
      showEvents();
      break;

    case 'errors':
      showErrors();
      break;

    case 'handlers':
      showHandlers();
      break;

    case 'sessions':
      showSessions();
      break;

    case 'clear':
      console.clear();
      break;

    case 'exit':
    case 'quit':
      state.running = false;
      rl.close();
      break;

    default:
      // Try to execute as a game command
      await executeGameCommand(trimmed);
      break;
  }
}

/**
 * Main REPL loop
 */
function startRepl(): void {
  showWelcome();

  // Show initial context
  print('Default scenario loaded with Alice and Bob.');
  showContext();
  print('Ready to accept commands!\n');

  rl.on('line', async (input: string) => {
    await processCommand(input);
    if (state.running) {
      rl.prompt();
    }
  });

  rl.on('close', () => {
    print('Goodbye. See you next time!');
    output.flush();
    output.stop();
    process.exit(0);
  });

  // Start the prompt
  rl.prompt();
}

// Start the CLI
if (require.main === module) {
  startRepl();
}

export { startRepl, processCommand, state as cliState };
