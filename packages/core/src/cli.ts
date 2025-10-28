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
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';
import { createDefaultWorldScenario } from '~/testing/scenarios/default';
import { getTemplatesForLocale } from '~/narrative';
import { Locale } from '~/types/i18n';
import { TemplateFunction } from '~/types';

// CLI State
interface CliState {
  context: TransformerContext;
  currentActor?: ActorURN;
  currentLocation?: PlaceURN;
  workbenchSession?: any;
  running: boolean;
}

const context = createTransformerContext();
const defaultScenario = createDefaultWorldScenario(context);

// Initialize CLI state with default actor context
const state: CliState = {
  context,
  currentActor: 'flux:actor:alice' as ActorURN, // Default to alice from the scenario
  currentLocation: 'flux:place:default' as PlaceURN, // Default location
  running: true,
};

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
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    Flux Game Engine CLI/REPL                     ║
║                                                                  ║
║  Interactive command-line interface for testing and development  ║
║  Type 'help' for available commands or 'exit' to quit            ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

/**
 * Show current context state
 */
function showContext(): void {
  console.log(`
Current Context:
  Actor: ${state.currentActor || 'none'}
  Location: ${state.currentLocation || 'none'}
  Workbench Session: ${state.workbenchSession ? 'active' : 'none'}

World State:
  Actors: ${Object.keys(state.context.world.actors).length}
  Places: ${Object.keys(state.context.world.places).length}
  Sessions: ${Object.keys(state.context.world.sessions).length}
`);
}

/**
 * Show declared events
 */
function showEvents(): void {
  const events = state.context.getDeclaredEvents();
  if (events.length === 0) {
    console.log('No events declared.');
    return;
  }

  console.log(`\nDeclared Events (${events.length}):`);
  for (const event of events) {
    console.log(`  ${event.type} - ${event.trace || 'no trace'}`);
  }
}

/**
 * Show declared errors
 */
function showErrors(): void {
  const errors = state.context.getDeclaredErrors();
  if (errors.length === 0) {
    console.log('No errors declared.');
    return;
  }

  console.log(`\nDeclared Errors (${errors.length}):`);
  for (const error of errors) {
    console.log(`  ${error.code || 'unknown'} - ${error.trace || 'no trace'}`);
  }
}

/**
 * Display help information
 */
function showHelp(command?: string): void {
  if (command) {
    console.log(`No specific help available for '${command}'. Type 'help' for all commands.`);
    return;
  }

  console.log(`
Available Commands:

CLI COMMANDS:
  help [command]      - Show this help
  actor <id>          - Switch to actor context
  context             - Show current context state
  events              - Show declared events
  errors              - Show declared errors
  handlers            - List available command handlers
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
  console.log(`Scenario loading not yet implemented: ${scenarioName}`);
}

/**
 * Create a new actor
 */
function createActor(name: string): void {
  console.log(`Actor creation not yet implemented: ${name}`);
}

/**
 * Switch to a different actor context
 */
function switchActor(actorId: string): void {
  const actor = state.context.world.actors[actorId as ActorURN];
  if (!actor) {
    console.log(`Actor not found: ${actorId}`);
    return;
  }

  state.currentActor = actorId as ActorURN;
  state.currentLocation = actor.location;
  console.log(`✓ Switched to actor: ${actor.name} (${actorId})`);
}

/**
 * Show available command handlers
 */
function showHandlers(): void {
  console.log(`\nAvailable Command Handlers (${PURE_GAME_LOGIC_HANDLERS.length}):`);

  const handlers = getAvailableHandlers();
  for (const handler of handlers) {
    // Try to get the command type from the handler
    const handlerName = handler.constructor.name;
    console.log(`  ${handlerName}`);
  }
}

/**
 * Execute a game command via the intent system
 */
function executeGameCommand(input: string): void {
  if (!state.currentActor || !state.currentLocation) {
    console.log('No actor context set. Use "actor <id>" or load a scenario first.');
    return;
  }

  try {
    // Create intent from input
    const intent = createIntent({
      actor: state.currentActor,
      location: state.currentLocation,
      session: state.workbenchSession?.session?.id,
      text: input,
    });

    // Execute intent through the pipeline
    const updatedContext = executeIntent(state.context, intent);

    // Update state with new context
    state.context = updatedContext;

    // Show any events or errors that were declared
    const events = state.context.getDeclaredEvents();
    const errors = state.context.getDeclaredErrors();

    if (events.length > 0) {
      console.log(`✓ Command executed. ${events.length} event(s) declared.\n`);

      // Generate and display narrative for each event
      const templates = getTemplatesForLocale(Locale.en_US);
      for (const event of events) {
        const template = templates[event.type] as TemplateFunction<any, any>;
        if (template && state.currentActor) {
          const narrative = template(state.context, event, state.currentActor);
          if (narrative.trim()) {
            console.log(`📖 ${narrative}\n`);
          }
        }
      }
    } else if (errors.length > 0) {
      console.log(`✗ Command failed. ${errors.length} error(s) declared.`);
      showErrors();
    } else {
      console.log('✓ Command executed successfully.');
    }

  } catch (error) {
    console.error(`✗ Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process a single command line input
 */
function processCommand(input: string): void {
  const trimmed = input.trim();
  if (!trimmed) return;

  const [command, ...args] = trimmed.split(/\s+/);

  switch (command.toLowerCase()) {
    case 'help':
      showHelp(args[0]);
      break;

    case 'scenario':
      if (args.length === 0) {
        console.log('Usage: scenario <name>');
        console.log('Available: combat-basic, workbench-simple, party-test');
      } else {
        loadScenario(args[0]);
      }
      break;

    case 'create':
      if (args.length < 2) {
        console.log('Usage: create <type> <name>');
        console.log('Types: actor, place');
      } else if (args[0] === 'actor') {
        createActor(args.slice(1).join(' '));
      } else {
        console.log(`Unknown create type: ${args[0]}`);
      }
      break;

    case 'actor':
      if (args.length === 0) {
        console.log('Usage: actor <id>');
        console.log('Available actors:', Object.keys(state.context.world.actors));
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
      executeGameCommand(trimmed);
      break;
  }
}

/**
 * Main REPL loop
 */
function startRepl(): void {
  showWelcome();

  // Show initial context
  console.log('Default scenario loaded with Alice and Bob.');
  showContext();
  console.log('Ready to accept commands!\n');

  rl.on('line', (input: string) => {
    processCommand(input);
    if (state.running) {
      rl.prompt();
    }
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
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
