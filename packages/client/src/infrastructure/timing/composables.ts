import { ref, computed, onUnmounted, type ComputedRef } from 'vue';

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

export type TimingBackoffComposable = {
  // Essential state (readonly)
  readonly canAttempt: ComputedRef<boolean>;
  readonly isWaiting: ComputedRef<boolean>;

  // Essential methods
  scheduleAttempt: (callback: () => Promise<void> | void) => void;
  reset: () => void;
  getStatus: () => string;
};

export const DEFAULT_TIMING_DEPS: TimingDependencies = {
  setTimeout: ((callback: () => void, delay: number) => setTimeout(callback, delay)) as unknown as typeof setTimeout,
  clearTimeout: ((id: number) => clearTimeout(id)) as unknown as typeof clearTimeout,
  now: () => Date.now(),
};

export const DEFAULT_TIMING_CONFIG: TimingConfig = {
  durationMs: 1_000,
  maxDelayMs: 15_000,
  maxAttempts: 10,
  easingFunction: (progress) => Math.pow(2, progress),
  jitterMs: 100,
};

export const DEFAULT_EXPONENTIAL_CONFIG: ExponentialBackoffConfig = {
  initialDelayMs: 1_000,
  maxDelayMs: 15_000,
  backoffMultiplier: 1.618,
  maxAttempts: 30,
  jitterMs: 100,
};

/**
 * Core timing backoff composable
 *
 * Provides configurable timing logic using easing functions.
 * This is the foundational composable that other timing strategies build upon.
 */
export function useTimingBackoff(
  config: Partial<TimingConfig> = {},
  deps: TimingDependencies = DEFAULT_TIMING_DEPS,
): TimingBackoffComposable {
  const mergedConfig = { ...DEFAULT_TIMING_CONFIG, ...config };

  // Internal state
  const attempts = ref(0);
  const _isWaiting = ref(false);
  const nextAttemptAt = ref<number | null>(null);
  const timeoutId = ref<ReturnType<typeof setTimeout> | null>(null);

  // Computed properties
  const isWaiting = computed(() => _isWaiting.value);

  // Computed properties
  const canAttempt = computed(() => {
    if (mergedConfig.maxAttempts && attempts.value >= mergedConfig.maxAttempts) {
      return false;
    }
    return !isWaiting.value;
  });

  /**
   * Calculate delay for next attempt using easing function
   */
  function calculateDelay(attemptNumber: number): number {
    // Normalize attempt number to 0-1 range for easing function
    const maxAttempts = mergedConfig.maxAttempts || 10;
    const normalizedPosition = Math.min(attemptNumber / (maxAttempts - 1), 1);

    // Apply easing function to get multiplier
    const multiplier = mergedConfig.easingFunction(normalizedPosition);
    const baseDelay = mergedConfig.durationMs * multiplier;
    const cappedDelay = mergedConfig.maxDelayMs ? Math.min(baseDelay, mergedConfig.maxDelayMs) : baseDelay;

    // Add jitter to prevent thundering herd
    const jitter = mergedConfig.jitterMs ? (Math.random() * mergedConfig.jitterMs) : 0;

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Schedule next attempt with exponential backoff
   */
  function scheduleAttempt(callback: () => Promise<void> | void): void {
    if (!canAttempt.value) {
      throw new Error('Cannot schedule attempt: max attempts reached or already waiting');
    }

    const delay = calculateDelay(attempts.value);
    const attemptTime = deps.now() + delay;

    attempts.value += 1;
    _isWaiting.value = true;
    nextAttemptAt.value = attemptTime;

    timeoutId.value = deps.setTimeout(async () => {
      _isWaiting.value = false;
      nextAttemptAt.value = null;
      timeoutId.value = null;

      try {
        await callback();
      } catch (error) {
        // Let the caller handle the error and decide whether to retry
        throw error;
      }
    }, delay);
  }

  /**
   * Cancel any pending attempt
   */
  function cancel(): void {
    if (timeoutId.value) {
      deps.clearTimeout(timeoutId.value);
      timeoutId.value = null;
    }

    _isWaiting.value = false;
    nextAttemptAt.value = null;
  }

  /**
   * Reset backoff state (call after successful operation)
   */
  function reset(): void {
    cancel();
    attempts.value = 0;
  }

  /**
   * Get current backoff status
   */
  function getStatus(): string {
    const maxAttempts = mergedConfig.maxAttempts;
    const hasReachedMax = maxAttempts ? attempts.value >= maxAttempts : false;

    if (hasReachedMax) {
      return `Max attempts reached (${attempts.value}/${maxAttempts})`;
    }

    if (isWaiting.value) {
      const timeUntilNext = nextAttemptAt.value ? Math.max(0, nextAttemptAt.value - deps.now()) : 0;
      const timeLeft = Math.ceil(timeUntilNext / 1000);
      return `Waiting ${timeLeft}s (attempt ${attempts.value}/${maxAttempts || '∞'})`;
    }

    if (attempts.value > 0) {
      return `Ready to retry (attempt ${attempts.value}/${maxAttempts || '∞'})`;
    }

    return 'Ready';
  }

  /**
   * Cleanup function
   */
  function cleanup(): void {
    cancel();
    attempts.value = 0;
  }

  // Cleanup on unmount
  onUnmounted(cleanup);

  return {
    // Essential state (readonly)
    canAttempt,
    isWaiting,

    // Essential methods
    scheduleAttempt,
    reset,
    getStatus,
  };
}

/**
 * Exponential backoff composable
 *
 * Specialized timing composable that implements exponential backoff strategy.
 * Built on top of useTimingBackoff with exponential easing function.
 */
export function useExponentialBackoff(
  config: Partial<ExponentialBackoffConfig> = {},
  deps: TimingDependencies = DEFAULT_TIMING_DEPS,
): TimingBackoffComposable {
  const mergedConfig = { ...DEFAULT_EXPONENTIAL_CONFIG, ...config };

  const timingConfig: TimingConfig = {
    durationMs: mergedConfig.initialDelayMs,
    maxDelayMs: mergedConfig.maxDelayMs,
    maxAttempts: mergedConfig.maxAttempts,
    easingFunction: (position: NormalizedValueBetweenZeroAndOne) =>
      Math.pow(mergedConfig.backoffMultiplier, position * (mergedConfig.maxAttempts || 10)),
    jitterMs: mergedConfig.jitterMs,
  };

  return useTimingBackoff(timingConfig, deps);
}
