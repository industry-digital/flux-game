import { ref, computed, onUnmounted } from 'vue';
import type {
  ReconnectConfig,
  ReconnectState
} from '~/types/xmpp';

/**
 * XMPP reconnection strategy composable
 *
 * Handles exponential backoff reconnection logic without managing
 * the actual connection. Provides reconnection state and timing.
 *
 * @param config - Reconnection configuration
 * @returns Reactive reconnection state and control methods
 */
export function useXmppReconnect(config: ReconnectConfig) {
  // Internal state
  const attempts = ref(0);
  const isReconnecting = ref(false);
  const nextAttemptAt = ref<number | null>(null);
  const reconnectTimeout = ref<NodeJS.Timeout | null>(null);

  // Computed properties
  const canReconnect = computed(() =>
    attempts.value < config.maxAttempts && !isReconnecting.value
  );

  const hasReachedMaxAttempts = computed(() =>
    attempts.value >= config.maxAttempts
  );

  const timeUntilNextAttempt = computed(() => {
    if (!nextAttemptAt.value) return 0;
    return Math.max(0, nextAttemptAt.value - Date.now());
  });

  // Reconnection state object
  const reconnectState = computed<ReconnectState>(() => ({
    attempts: attempts.value,
    isReconnecting: isReconnecting.value,
    nextAttemptAt: nextAttemptAt.value,
  }));

  /**
   * Calculate delay for next reconnection attempt using exponential backoff
   */
  function calculateDelay(attemptNumber: number): number {
    return config.delayMs * Math.pow(config.backoffMultiplier, attemptNumber);
  }

  /**
   * Schedule a reconnection attempt
   */
  function scheduleReconnect(onReconnect: () => Promise<void>): void {
    if (!canReconnect.value) {
      throw new Error('Cannot schedule reconnect: max attempts reached or already reconnecting');
    }

    const delay = calculateDelay(attempts.value);
    const attemptTime = Date.now() + delay;

    attempts.value += 1;
    isReconnecting.value = true;
    nextAttemptAt.value = attemptTime;

    reconnectTimeout.value = setTimeout(async () => {
      try {
        await onReconnect();
        // If successful, reset will be called externally
      } catch (error) {
        // If failed, continue with exponential backoff
        isReconnecting.value = false;

        if (canReconnect.value) {
          // Schedule next attempt
          scheduleReconnect(onReconnect);
        } else {
          // Max attempts reached
          nextAttemptAt.value = null;
        }
      }
    }, delay);
  }

  /**
   * Cancel any pending reconnection attempt
   */
  function cancelReconnect(): void {
    if (reconnectTimeout.value) {
      clearTimeout(reconnectTimeout.value);
      reconnectTimeout.value = null;
    }

    isReconnecting.value = false;
    nextAttemptAt.value = null;
  }

  /**
   * Reset reconnection state (call after successful connection)
   */
  function reset(): void {
    cancelReconnect();
    attempts.value = 0;
  }

  /**
   * Force a reconnection attempt immediately
   */
  async function reconnectNow(onReconnect: () => Promise<void>): Promise<void> {
    if (hasReachedMaxAttempts.value) {
      throw new Error('Cannot reconnect: maximum attempts reached');
    }

    cancelReconnect();

    attempts.value += 1;
    isReconnecting.value = true;
    nextAttemptAt.value = null;

    try {
      await onReconnect();
      // Success - reset will be called externally
    } catch (error) {
      isReconnecting.value = false;
      throw error;
    }
  }

  /**
   * Get human-readable status
   */
  function getStatus(): string {
    if (hasReachedMaxAttempts.value) {
      return 'Max reconnection attempts reached';
    }

    if (isReconnecting.value) {
      return 'Reconnecting...';
    }

    if (attempts.value > 0) {
      const timeLeft = Math.ceil(timeUntilNextAttempt.value / 1000);
      return `Next attempt in ${timeLeft}s (${attempts.value}/${config.maxAttempts})`;
    }

    return 'Ready to connect';
  }

  /**
   * Clean up timeouts on unmount
   */
  function cleanup(): void {
    cancelReconnect();
    attempts.value = 0;
  }

  // Cleanup on unmount
  onUnmounted(cleanup);

  return {
    // State
    attempts,
    isReconnecting,
    nextAttemptAt,

    // Computed
    canReconnect,
    hasReachedMaxAttempts,
    timeUntilNextAttempt,
    reconnectState,

    // Methods
    calculateDelay,
    scheduleReconnect,
    cancelReconnect,
    reset,
    reconnectNow,
    getStatus,
    cleanup,
  };
}
