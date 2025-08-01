export type EasingFunction = (t: number) => number;

export const Easing = {
  LINEAR: (t: number) => t,
  LOGISTIC: (t: number) => 1 / (1 + Math.exp(-t)),
  QUADRATIC: (t: number) => t * t,
  CUBIC: (t: number) => t * t * t,
  EXPONENTIAL: (t: number) => Math.exp(t),
  EASE_OUT_QUAD: (t: number) => 1 - (1 - t) * (1 - t),
  STEP: (t: number) => t >= 1 ? 1 : 0,
  SINE: (t: number) => Math.sin(t * Math.PI / 2),

  // Weather-specific oscillation curves
  PURE_SINE: (t: number) => t, // Identity for pure sine oscillation
  EASE_IN_OUT_SINE: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,

} as const satisfies Record<string, EasingFunction>;

export type EasingFunctionName = keyof typeof Easing;

export type CurvePosition = {
  /**
   * The position `t` on an easing curve. Normalized to [0, 1]
   */
  position: number;
}

export type SeededCurvePosition = CurvePosition & {
  /**
   * The seed value for the weather generator
   */
  seed: number;
}

export type SeededCurvePositionWithValue = SeededCurvePosition & {
  /**
   * The computed value of the property at the position `t` on the curve
   */
  value: number;
};

export type CurvePositionWithValue = CurvePosition & {
  /**
   * The computed value of the property at the position `t` on the curve
   */
  value: number;
};
