export type NormalizedValueBetweenZeroAndOne = number;
export type EasingFunction = (position: NormalizedValueBetweenZeroAndOne) => number;

export type TimingConfig = {
  durationMs: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  easingFunction: EasingFunction;
  jitterMs?: number;
};

export type ExponentialBackoffConfig = {
  initialDelayMs: number;
  maxDelayMs?: number;
  backoffMultiplier: number;
  maxAttempts?: number;
  jitterMs?: number;
};

export type TimingDependencies = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  now: () => number;
};

export type TimingBackoffHook = {
  // Essential state (readonly)
  readonly canAttempt: boolean;
  readonly isWaiting: boolean;

  // Essential methods
  scheduleAttempt: (callback: () => Promise<void> | void) => void;
  reset: () => void;
  getStatus: () => string;
};
