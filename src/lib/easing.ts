import { EasingFunction } from '~/types/easing';

export const Easing: Record<string, EasingFunction> = {
  LINEAR: (t: number) => t,
  LOGISTIC: (t: number) => 1 / (1 + Math.exp(-t)),
  EXPONENTIAL: (t: number) => Math.exp(t),
  EASE_OUT_QUAD: (t: number) => 1 - (1 - t) * (1 - t),
  STEP: (t: number) => t >= 1 ? 1 : 0,
} as const;
