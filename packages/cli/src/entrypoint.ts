/**
 * Flux Game Engine CLI/REPL Entrypoint
 *
 * Pure functional implementation with effects pushed to the edges.
 * Follows the "functional core, imperative shell" pattern without classes.
 */

import * as readline from 'readline';
import { createTransformerContext, ActorURN, createIntent, executeIntent, IntentInput } from '@flux/core';
import { createReplState } from './state';
import { runPipeline } from './input/pipeline';
import { processCommand } from './command';
import { DEFAULT_PIPELINE } from './input/processors';
import { BatchSchedulingOutput } from './output';
import {
  executeEffects,
  createEffectExecutor,
  createDefaultExecutionDependencies,
  type EffectExecutor,
} from './execution';
import { ReplCommandType, ReplOutputInterface, ReplCommand, ReplEffect, ReplState } from './types';
import { ProcessGameCommandDependencies } from './command';
import * as memo from './memo';
import { loadScenario, resolveScenarioId, getScenario } from '~/scenario/registry';
import {
  createInputQueueProcessor,
  createInputQueueState,
  isPriorityCommand,
  type InputProcessor
} from './input/queue';


type ExtendedReplOutputInterface = ReplOutputInterface & {
  flush(): void;
  stop(): void;
};

type EnhancedReplRuntime = {
  rl: readline.ReadLine;
  output: ExtendedReplOutputInterface;
};

const createRuntime = (): EnhancedReplRuntime => ({
  rl: readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  }),
  output: new BatchSchedulingOutput() as ExtendedReplOutputInterface,
});

const showWelcome = (runtime: EnhancedReplRuntime): void => {
  runtime.output.print(`
╔══════════════════════════════════════════════════════════════════╗
║                    Flux Game Engine CLI/REPL                     ║
║                                                                  ║
║  Interactive command-line interface for testing and development  ║
║  Type 'help' for available commands or 'exit' to quit            ║
╚══════════════════════════════════════════════════════════════════╝
`);
};

const createCommandDependencies = (): ProcessGameCommandDependencies => {
  return {
    // Memo operations
    getActorSession: memo.getActorSession,
    getActorLocation: memo.getActorLocation,
    setActorSession: memo.setActorSession,
    removeActorSession: memo.removeActorSession,
    setActorLocation: memo.setActorLocation,

    // Core operations
    executeIntent: executeIntent,
    createIntent: (input: IntentInput) => createIntent(input),
  };
};

const createReplInputProcessor = (
  effectsBuffer: ReplEffect[],
  executor: EffectExecutor,
  runtime: EnhancedReplRuntime,
  deps: ProcessGameCommandDependencies,
): InputProcessor<ReplState> => {

  const processInput = (state: ReplState, input: string, trace: string): ReplState => {
    const command = runPipeline(input, undefined, DEFAULT_PIPELINE, trace);
    // Direct mutation of state and effectsBuffer for zero-allocation processing.
    // Measured orders of magnitude improvement from pooling/reuse.
    // Correctness maintained through single-ownership and explicit mutation boundaries.
    processCommand(state, command, effectsBuffer, deps);
    return state;
  };

  return async (input: string, trace: string, state: ReplState): Promise<ReplState> => {
    state = processInput(state, input, trace);
    await executeEffects(executor, effectsBuffer);

    if (state.running) {
      runtime.rl.prompt();
    }

    return state;
  };
};

const SHOW_CONTEXT_COMMAND: ReplCommand = { type: ReplCommandType.SHOW_CONTEXT, trace: 'initial-context' };
const READY_MESSAGE = 'Ready to accept commands!\n';

enum ReadlineEvent {
  LINE = 'line',
  CLOSE = 'close',
}

// Main REPL loop (imperative shell)
export const startRepl = (
  context = createTransformerContext(),
  scenarioId = resolveScenarioId(),
  runtime = createRuntime(),
): void => {
  // Load scenario first, with a callback to set current actor
  let currentActor: ActorURN | undefined;
  const scenario = loadScenario(context, scenarioId, (actorId: ActorURN) => {
    currentActor = actorId;
  });

  // Create state with the loaded scenario
  const state = createReplState(context, scenario);

  // Set the current actor from scenario loading
  if (currentActor) {
    state.currentActor = currentActor;
  }

  // Create effect executor with runtime dependencies
  const runtimeDeps = createDefaultExecutionDependencies(runtime.rl, runtime.output);
  const executor = createEffectExecutor(runtimeDeps);

  // Initialize memo from world state
  memo.initializeMemoFromWorld(state.memo, state.context.world.actors);

  showWelcome(runtime);

  // Show loaded scenario info
  const scenarioInfo = getScenario(scenarioId);
  if (scenarioInfo) {
    runtime.output.print(`Scenario: ${scenarioInfo.name}`);
    runtime.output.print(scenarioInfo.description);
  }

  // Pre-allocated effects buffer for zero-allocation command processing
  const effectsBuffer: ReplEffect[] = [];

  // Create command dependencies
  const commandDeps = createCommandDependencies();

  // Show initial context
  processCommand(state, SHOW_CONTEXT_COMMAND, effectsBuffer, commandDeps);
  executeEffects(executor, effectsBuffer);

  runtime.output.print(READY_MESSAGE);

  // Create the input processor that wraps existing logic
  const inputProcessor = createReplInputProcessor(
    effectsBuffer,
    executor,
    runtime,
    commandDeps
  );

  // Create the queue with application state
  const queueProcessor = createInputQueueProcessor(
    state,           // Initial application state
    inputProcessor,  // How to process each queued input
    createInputQueueState(100) // Queue capacity
  );

  // Replace direct input handler with queue-based handling
  const onReadLineInput = (input: string) => {
    const trace = context.uniqid();
    const timestamp = Date.now();

    // Route to appropriate queue based on command priority
    if (isPriorityCommand(input)) {
      queueProcessor.enqueuePriority(input, trace, timestamp);
    } else {
      queueProcessor.enqueue(input, trace, timestamp);
    }
  };

  runtime.rl.on(ReadlineEvent.LINE, onReadLineInput);

  runtime.rl.on(ReadlineEvent.CLOSE, () => {
    // Exit already handled by EXIT command or external close
    // Just ensure clean shutdown without duplicate goodbye message
    if (state.running) {
      state.running = false;
      runtime.output.stop();
    }
  });

  runtime.rl.prompt();
};

// Export for testing and module usage
export {
  createRuntime,
  type EnhancedReplRuntime,
  type ExtendedReplOutputInterface,
};

// Start the CLI if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startRepl();
}
