import { ref, computed, onUnmounted, type ComputedRef } from 'vue';

export type BackoffConfig = {
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

export type ExponentialBackoffComposable = {
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

export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  initialDelayMs: 1_000,
  maxDelayMs: 15_000,
  backoffMultiplier: 2,
  maxAttempts: 10,
  jitterMs: 100,
};

/**
 * Exponential backoff timing composable
 *
 * Provides pure exponential backoff logic that can be composed
 * into any retry/reconnection scenario.
 */
export function useExponentialBackoff(
  config: Partial<BackoffConfig> = {},
  deps: TimingDependencies = DEFAULT_TIMING_DEPS,
): ExponentialBackoffComposable {
  const mergedConfig = { ...DEFAULT_BACKOFF_CONFIG, ...config };

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

  const hasReachedMaxAttempts = computed(() => {
    return mergedConfig.maxAttempts ? attempts.value >= mergedConfig.maxAttempts : false;
  });

  const timeUntilNextAttempt = computed(() => {
    if (!nextAttemptAt.value) return 0;
    return Math.max(0, nextAttemptAt.value - deps.now());
  });

  /**
   * Calculate delay for next attempt using exponential backoff
   */
  function calculateDelay(attemptNumber: number): number {
    const baseDelay = mergedConfig.initialDelayMs * Math.pow(mergedConfig.backoffMultiplier, attemptNumber);
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
