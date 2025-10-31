/**
 * Flux Game Engine CLI/REPL Entrypoint
 *
 * Pure functional implementation with effects pushed to the edges.
 * Follows the "functional core, imperative shell" pattern without classes.
 */

import * as readline from 'readline';
import { createTransformerContext, ActorURN } from '@flux/core';
import { createReplState } from './state';
import { runPipeline } from './input/pipeline';
import { processCommand } from './command';
import { DEFAULT_PIPELINE } from './input/processors';
import { BatchSchedulingOutput } from './output';
import { executeEffects, createEffectExecutor, createDefaultRuntimeDependencies } from './execution';
import { ReplEffectType, ReplCommandType, ReplOutputInterface, CommandDependencies, ReplCommand, ReplEffect } from './types';
import * as memo from './memo';
import * as effects from './effect';
import { loadScenario, resolveScenarioId, getScenario } from '~/scenario/registry';

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

const DEFAULT_COMMAND_DEPS: CommandDependencies = {
  // Memo operations
  getActorSession: memo.getActorSession,
  getActorLocation: memo.getActorLocation,
  setActorSession: memo.setActorSession,
  removeActorSession: memo.removeActorSession,
  setActorLocation: memo.setActorLocation,

  // Effect creators
  createPrintEffect: effects.createPrintEffect,
  createPauseInputEffect: effects.createPauseInputEffect,
  createResumeInputEffect: effects.createResumeInputEffect,
  createFlushOutputEffect: effects.createFlushOutputEffect,
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
  commandDeps = DEFAULT_COMMAND_DEPS,
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
  const runtimeDeps = createDefaultRuntimeDependencies(runtime.rl, runtime.output);
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

  // Show initial context
  processCommand(state, SHOW_CONTEXT_COMMAND, commandDeps, effectsBuffer);
  executeEffects(executor, effectsBuffer);

  runtime.output.print(READY_MESSAGE);

  // This *must* be synchronous.
  const processInput = (input: string, trace = context.uniqid()): ReplEffect[] => {
    const command = runPipeline(input, undefined, DEFAULT_PIPELINE, trace);
    processCommand(state, command, commandDeps, effectsBuffer);
    return effectsBuffer;
  };

  const onReadLineInput = async (input: string) => {
    const effects = processInput(input);
    // State is mutated in place by the command processor
    await executeEffects(executor, effects);
    if (state.running) {
      runtime.rl.prompt();
    }
  };

  runtime.rl.on(ReadlineEvent.LINE, onReadLineInput);

  runtime.rl.on(ReadlineEvent.CLOSE, () => {
    executeEffects(executor, [{ type: ReplEffectType.EXIT_REPL }]);
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
