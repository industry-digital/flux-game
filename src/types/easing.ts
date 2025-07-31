export type EasingFunction = (t: number) => number;

export const Easing: Record<string, EasingFunction> = {
  LINEAR: (t: number) => t,
  LOGISTIC: (t: number) => 1 / (1 + Math.exp(-t)),
  QUADRATIC: (t: number) => t * t,
  CUBIC: (t: number) => t * t * t,
  EXPONENTIAL: (t: number) => Math.exp(t),
  EASE_OUT_QUAD: (t: number) => 1 - (1 - t) * (1 - t),
  STEP: (t: number) => t >= 1 ? 1 : 0,
  SINE: (t: number) => Math.sin(t * Math.PI / 2),
} as const;

export type EasingFunctionName = keyof typeof Easing;
