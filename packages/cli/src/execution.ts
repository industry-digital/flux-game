/**
 * Effect Execution Engine
 *
 * Pure functional interface for executing REPL effects.
 * Separates effect interpretation from runtime concerns.
 */

import { ReplEffect, ReplEffectType } from './types';

// ===== EFFECT EXECUTION INTERFACE =====

export type EffectExecutor = {
  print: (text: string) => void;
  printSequence: (sequence: readonly { text: string; delay: number }[]) => Promise<void>;
  pauseInput: () => void;
  resumeInput: () => void;
  flushOutput: () => void;
  clearScreen: () => void;
  exitRepl: () => void;
};

// ===== PURE EFFECT EXECUTION =====

export const executeEffect = async (executor: EffectExecutor, effect: ReplEffect): Promise<void> => {
  switch (effect.type) {
    case ReplEffectType.PRINT:
      executor.print(effect.text);
      break;

    case ReplEffectType.PRINT_SEQUENCE:
      await executor.printSequence(effect.sequence);
      break;

    case ReplEffectType.PAUSE_INPUT:
      executor.pauseInput();
      break;

    case ReplEffectType.RESUME_INPUT:
      executor.resumeInput();
      break;

    case ReplEffectType.FLUSH_OUTPUT:
      executor.flushOutput();
      break;

    case ReplEffectType.CLEAR_SCREEN:
      executor.clearScreen();
      break;

    case ReplEffectType.EXIT_REPL:
      executor.exitRepl();
      break;

    default:
      // Exhaustive check - TypeScript will error if we miss a case
      const _exhaustive: never = effect;
      throw new Error(`Unknown effect type: ${JSON.stringify(_exhaustive)}`);
  }
};

export const executeEffects = async (
  executor: EffectExecutor,
  effects: readonly ReplEffect[]
): Promise<void> => {
  for (const effect of effects) {
    await executeEffect(executor, effect);
  }
};

// ===== EFFECT EXECUTOR FACTORIES =====

export type RuntimeDependencies = {
  rl: {
    pause: () => void;
    resume: () => void;
    close: () => void;
  };
  output: {
    print: (text: string) => void;
    flush: () => void;
    stop: () => void;
  };
  console: {
    clear: () => void;
  };
  process: {
    exit: (code: number) => void;
  };
};

export const createEffectExecutor = (deps: RuntimeDependencies): EffectExecutor => ({
  print: (text: string) => {
    deps.output.print(text);
  },

  printSequence: async (sequence) => {
    for (const item of sequence) {
      if (item.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, item.delay));
      }
      if (item.text.trim()) {
        deps.output.print(item.text);
      }
    }
    deps.output.print(''); // Final newline
  },

  pauseInput: () => {
    deps.rl.pause();
  },

  resumeInput: () => {
    deps.rl.resume();
  },

  flushOutput: () => {
    deps.output.flush();
  },

  clearScreen: () => {
    deps.console.clear();
  },

  exitRepl: () => {
    deps.output.print('Goodbye. See you next time!');
    deps.output.flush();
    deps.output.stop();
    deps.rl.close();
    deps.process.exit(0);
  },
});

// ===== DEFAULT RUNTIME DEPENDENCIES =====

export const createDefaultRuntimeDependencies = (
  rl: RuntimeDependencies['rl'],
  output: RuntimeDependencies['output']
): RuntimeDependencies => ({
  rl,
  output,
  console: global.console,
  process: global.process,
});
