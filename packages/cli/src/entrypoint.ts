/**
 * Flux Game Engine CLI/REPL Entrypoint
 *
 * Pure functional implementation with effects pushed to the edges.
 * Follows the "functional core, imperative shell" pattern without classes.
 */

import * as readline from 'readline';
import { createTransformerContext } from '@flux/core';
import { createReplState } from './state';
import { runPipeline } from './input';
import { processCommand } from './command';
import { DEFAULT_PIPELINE } from './processors';
import { BatchSchedulingOutput } from './output';
import { executeEffects, createEffectExecutor, createDefaultRuntimeDependencies } from './execution';
import { ReplEffectType, ReplCommandType, ReplOutputInterface, CommandDependencies, ReplCommand } from './types';
import * as memo from './memo';
import * as effects from './effect';

// ===== SIDE EFFECTS (IMPERATIVE SHELL) =====

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

// Effect execution is now handled by the execution module

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

// Create command dependencies (wiring modules together)
const DEFAULT_COMMAND_DEPS: CommandDependencies = {
  memo: {
    getActorSession: memo.getActorSession,
    getActorLocation: memo.getActorLocation,
    setActorSession: memo.setActorSession,
    removeActorSession: memo.removeActorSession,
    setActorLocation: memo.setActorLocation,
  },
  effects: {
    createPrintEffect: effects.createPrintEffect,
    createPauseInputEffect: effects.createPauseInputEffect,
    createResumeInputEffect: effects.createResumeInputEffect,
    createFlushOutputEffect: effects.createFlushOutputEffect,
  },
};


const SHOW_CONTEXT_COMMAND: ReplCommand = { type: ReplCommandType.SHOW_CONTEXT };

// Main REPL loop (imperative shell)
export const startRepl = (
  context = createTransformerContext(),
  state = createReplState(context),
  runtime = createRuntime(),
  commandDeps = DEFAULT_COMMAND_DEPS,
): void => {

  // Create effect executor with runtime dependencies
  const runtimeDeps = createDefaultRuntimeDependencies(runtime.rl, runtime.output);
  const executor = createEffectExecutor(runtimeDeps);

  // Initialize memo from world state
  memo.initializeMemoFromWorld(state.memo, state.context.world.actors);

  showWelcome(runtime);
  runtime.output.print('Default scenario loaded with Alice and Bob.');

  // Show initial context
  const contextResult = processCommand(state, SHOW_CONTEXT_COMMAND, commandDeps);
  executeEffects(executor, contextResult.effects);

  runtime.output.print('Ready to accept commands!\n');

  runtime.rl.on('line', async (input: string) => {
    const command = runPipeline(input, undefined, DEFAULT_PIPELINE);
    const result = processCommand(state, command, commandDeps);

    state = result.newState;
    await executeEffects(executor, result.effects);

    if (state.running) {
      runtime.rl.prompt();
    }
  });

  runtime.rl.on('close', () => {
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
