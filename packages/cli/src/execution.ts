import { ReplEffect, ReplEffectType } from './types';

export type EffectExecutor = {
  print: (text: string) => void;
  printSequence: (sequence: readonly { text: string; delay: number }[]) => Promise<void>;
  pauseInput: () => void;
  resumeInput: () => void;
  flushOutput: () => void;
  clearScreen: () => void;
  exitRepl: () => void;
};

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

export type EffectExecutionDependencides = {
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

export const createEffectExecutor = (
  { output, rl, console, process }: EffectExecutionDependencides,
): EffectExecutor => ({
  print: (text: string) => {
    output.print(text);
  },

  printSequence: async (sequence) => {
    for (const item of sequence) {
      if (item.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, item.delay));
      }
      if (item.text.trim()) {
        output.print(item.text);
      }
    }
    output.print(''); // Final newline
  },

  pauseInput: () => {
    rl.pause();
  },

  resumeInput: () => {
    rl.resume();
  },

  flushOutput: () => {
    output.flush();
  },

  clearScreen: () => {
    console.clear();
  },

  exitRepl: () => {
    output.print('Goodbye. See you next time!');
    output.flush();
    output.stop();
    rl.close();
    process.exit(0);
  },
});

export const createDefaultExecutionDependencies = (
  rl: EffectExecutionDependencides['rl'],
  output: EffectExecutionDependencides['output'],
  console: EffectExecutionDependencides['console'] = global.console,
  process: EffectExecutionDependencides['process'] = global.process,
): EffectExecutionDependencides => ({
  rl,
  output,
  console,
  process,
});
