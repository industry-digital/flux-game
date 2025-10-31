import { ReplEffect, ReplEffectType } from '~/types';

export const createPrintEffect = (text: string): ReplEffect => ({
  type: ReplEffectType.PRINT,
  text,
});

export const createPauseInputEffect = (): ReplEffect => ({
  type: ReplEffectType.PAUSE_INPUT,
});

export const createResumeInputEffect = (): ReplEffect => ({
  type: ReplEffectType.RESUME_INPUT,
});

export const createFlushOutputEffect = (): ReplEffect => ({
  type: ReplEffectType.FLUSH_OUTPUT,
});

export const createClearScreenEffect = (): ReplEffect => ({
  type: ReplEffectType.CLEAR_SCREEN,
});

export const createExitReplEffect = (): ReplEffect => ({
  type: ReplEffectType.EXIT_REPL,
});
