import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { createComposableTestSuite } from '~/testing/vue-test-utils';
import type { ReconnectConfig } from '~/types/xmpp';
import {
  useXmppReconnect,
  DEFAULT_XMPP_RECONNECT_CONFIG,
  XmppReconnectionDependencies,
} from './reconnect';

describe('useXmppReconnect', () => {
  const testSuite = createComposableTestSuite();
  let mockSetTimeout: ReturnType<typeof vi.fn>;
  let mockClearTimeout: ReturnType<typeof vi.fn>;
  let mockDeps: XmppReconnectionDependencies;
  let timeoutCallbacks: Map<number, () => void>;
  let timeoutId: number;

  beforeEach(() => {
    testSuite.setup();
    timeoutCallbacks = new Map();
    timeoutId = 1;

    mockSetTimeout = vi.fn((callback: () => void, delay: number) => {
      const id = timeoutId++;
      timeoutCallbacks.set(id, callback);
      return id;
    });

    mockClearTimeout = vi.fn((id: number) => {
      timeoutCallbacks.delete(id);
    });

    mockDeps = {
      setTimeout: mockSetTimeout,
      clearTimeout: mockClearTimeout,
    } as unknown as XmppReconnectionDependencies;
  });

  afterEach(() => {
    testSuite.teardown();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);

        expect(reconnect.attempts.value).toBe(0);
        expect(reconnect.isReconnecting.value).toBe(false);
        expect(reconnect.nextAttemptAt.value).toBe(null);
        expect(reconnect.canReconnect.value).toBe(true);
        expect(reconnect.hasReachedMaxAttempts.value).toBe(false);
        expect(reconnect.timeUntilNextAttempt.value).toBe(0);
      });
    });

    it('should create reconnect state object', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);

        expect(reconnect.reconnectState.value).toStrictEqual({
          attempts: 0,
          isReconnecting: false,
          nextAttemptAt: null,
        });
      });
    });

    it('should use custom configuration', () => {
      testSuite.runWithContext(() => {
        const customConfig: ReconnectConfig = {
          maxAttempts: 3,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(customConfig, mockDeps);

        expect(reconnect.canReconnect.value).toBe(true);
        expect(reconnect.hasReachedMaxAttempts.value).toBe(false);
      });
    });
  });

  describe('exponential backoff calculation', () => {
    it('should calculate delay with exponential backoff', () => {
      testSuite.runWithContext(() => {
        const config: ReconnectConfig = {
          maxAttempts: 5,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);

        expect(reconnect.calculateDelay(0)).toBe(1000); // 1000 * 2^0
        expect(reconnect.calculateDelay(1)).toBe(2000); // 1000 * 2^1
        expect(reconnect.calculateDelay(2)).toBe(4000); // 1000 * 2^2
        expect(reconnect.calculateDelay(3)).toBe(8000); // 1000 * 2^3
      });
    });

    it('should handle fractional backoff multiplier', () => {
      testSuite.runWithContext(() => {
        const config: ReconnectConfig = {
          maxAttempts: 5,
          delayMs: 3000,
          backoffMultiplier: 1.5,
        };

        const reconnect = useXmppReconnect(config, mockDeps);

        expect(reconnect.calculateDelay(0)).toBe(3000); // 3000 * 1.5^0
        expect(reconnect.calculateDelay(1)).toBe(4500); // 3000 * 1.5^1
        expect(reconnect.calculateDelay(2)).toBe(6750); // 3000 * 1.5^2
      });
    });
  });

  describe('scheduled reconnection', () => {
    it('should schedule reconnection with correct delay', async () => {
      testSuite.runWithContext(async () => {
        const config: ReconnectConfig = {
          maxAttempts: 3,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);

        reconnect.scheduleReconnect(mockReconnectFn);

        expect(reconnect.attempts.value).toBe(1);
        expect(reconnect.isReconnecting.value).toBe(true);
        expect(reconnect.nextAttemptAt.value).toBeGreaterThan(Date.now());
        expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      });
    });

    it('should execute reconnection callback after delay', async () => {
      testSuite.runWithContext(async () => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);

        reconnect.scheduleReconnect(mockReconnectFn);

        // Execute the timeout callback
        const callback = timeoutCallbacks.get(1);
        expect(callback).toBeDefined();
        await callback!();

        expect(mockReconnectFn).toHaveBeenCalledOnce();
      });
    });

    it('should handle successful reconnection', async () => {
      testSuite.runWithContext(async () => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);

        reconnect.scheduleReconnect(mockReconnectFn);

        // Execute the timeout callback
        const callback = timeoutCallbacks.get(1);
        await callback!();

        // After successful reconnection, external code should call reset()
        reconnect.reset();

        expect(reconnect.attempts.value).toBe(0);
        expect(reconnect.isReconnecting.value).toBe(false);
        expect(reconnect.nextAttemptAt.value).toBe(null);
      });
    });

    it('should handle failed reconnection and schedule next attempt', async () => {
      testSuite.runWithContext(async () => {
        const config: ReconnectConfig = {
          maxAttempts: 3,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);
        const mockReconnectFn = vi.fn().mockRejectedValue(new Error('Connection failed'));

        reconnect.scheduleReconnect(mockReconnectFn);

        // Execute the first timeout callback
        const firstCallback = timeoutCallbacks.get(1);
        await firstCallback!();

        expect(reconnect.attempts.value).toBe(2); // Second attempt scheduled
        expect(reconnect.isReconnecting.value).toBe(true);
        expect(mockSetTimeout).toHaveBeenCalledTimes(2);
        expect(mockSetTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000); // 1000 * 2^1
      });
    });

    it('should stop scheduling after max attempts reached', async () => {
      testSuite.runWithContext(async () => {
        const config: ReconnectConfig = {
          maxAttempts: 2,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);
        const mockReconnectFn = vi.fn().mockRejectedValue(new Error('Connection failed'));

        reconnect.scheduleReconnect(mockReconnectFn);

        // Execute first attempt (fails)
        const firstCallback = timeoutCallbacks.get(1);
        await firstCallback!();

        // Execute second attempt (fails)
        const secondCallback = timeoutCallbacks.get(2);
        await secondCallback!();

        expect(reconnect.attempts.value).toBe(2);
        expect(reconnect.isReconnecting.value).toBe(false);
        expect(reconnect.hasReachedMaxAttempts.value).toBe(true);
        expect(reconnect.nextAttemptAt.value).toBe(null);
        expect(mockSetTimeout).toHaveBeenCalledTimes(2); // No third attempt
      });
    });

    it('should throw error when scheduling reconnect at max attempts', () => {
      testSuite.runWithContext(() => {
        const config: ReconnectConfig = {
          maxAttempts: 1,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);
        const mockReconnectFn = vi.fn();

        // First schedule should work
        reconnect.scheduleReconnect(mockReconnectFn);

        // Second schedule should throw
        expect(() => {
          reconnect.scheduleReconnect(mockReconnectFn);
        }).toThrow('Cannot schedule reconnect: max attempts reached or already reconnecting');
      });
    });
  });

  describe('immediate reconnection (reconnectNow)', () => {
    it('should reconnect immediately without delay', async () => {
      testSuite.runWithContext(async () => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);

        await reconnect.reconnectNow(mockReconnectFn);

        expect(reconnect.attempts.value).toBe(1);
        expect(reconnect.isReconnecting.value).toBe(true); // Still true until external reset() call
        expect(reconnect.nextAttemptAt.value).toBe(null);
        expect(mockReconnectFn).toHaveBeenCalledOnce();
        expect(mockSetTimeout).not.toHaveBeenCalled(); // No timeout for immediate reconnect

        // After successful reconnection, external code should call reset()
        reconnect.reset();
        expect(reconnect.isReconnecting.value).toBe(false);
        expect(reconnect.attempts.value).toBe(0);
      });
    });

    it('should handle failed immediate reconnection', async () => {
      testSuite.runWithContext(async () => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn().mockRejectedValue(new Error('Connection failed'));

        await expect(reconnect.reconnectNow(mockReconnectFn)).rejects.toThrow('Connection failed');

        expect(reconnect.attempts.value).toBe(1);
        expect(reconnect.isReconnecting.value).toBe(false);
        expect(mockReconnectFn).toHaveBeenCalledOnce();
      });
    });

    it('should cancel pending reconnection before immediate reconnect', async () => {
      testSuite.runWithContext(async () => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);

        // Schedule a reconnection
        reconnect.scheduleReconnect(mockReconnectFn);
        expect(mockSetTimeout).toHaveBeenCalledOnce();

        // Immediate reconnect should cancel the scheduled one
        await reconnect.reconnectNow(mockReconnectFn);

        expect(mockClearTimeout).toHaveBeenCalledWith(1);
        expect(reconnect.attempts.value).toBe(2); // One from schedule, one from immediate
      });
    });

    it('should throw error when max attempts reached', async () => {
      testSuite.runWithContext(async () => {
        const config: ReconnectConfig = {
          maxAttempts: 1,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);

        // First attempt
        await reconnect.reconnectNow(mockReconnectFn);

        // Second attempt should throw
        await expect(reconnect.reconnectNow(mockReconnectFn)).rejects.toThrow(
          'Cannot reconnect: maximum attempts reached'
        );
      });
    });
  });

  describe('state management', () => {
    it('should update canReconnect based on attempts and reconnecting state', async () => {
      testSuite.runWithContext(async () => {
        const config: ReconnectConfig = {
          maxAttempts: 2,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);

        expect(reconnect.canReconnect.value).toBe(true);

        // Start reconnecting
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);
        reconnect.scheduleReconnect(mockReconnectFn);

        expect(reconnect.canReconnect.value).toBe(false); // Currently reconnecting

        // Execute callback to complete reconnection
        const callback = timeoutCallbacks.get(1);
        await callback!();

        // After successful reconnection, external code should call reset()
        reconnect.reset();

        // After reset, should be able to reconnect again
        expect(reconnect.canReconnect.value).toBe(true);
        expect(reconnect.attempts.value).toBe(0);
      });
    });

    it('should update hasReachedMaxAttempts correctly', async () => {
      testSuite.runWithContext(async () => {
        const config: ReconnectConfig = {
          maxAttempts: 2,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);

        expect(reconnect.hasReachedMaxAttempts.value).toBe(false);

        // First attempt
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);
        await reconnect.reconnectNow(mockReconnectFn);
        expect(reconnect.hasReachedMaxAttempts.value).toBe(false);

        // Second attempt
        await reconnect.reconnectNow(mockReconnectFn);
        expect(reconnect.hasReachedMaxAttempts.value).toBe(true);
      });
    });

    it('should calculate timeUntilNextAttempt correctly', async () => {
      testSuite.runWithContext(async () => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);

        expect(reconnect.timeUntilNextAttempt.value).toBe(0);

        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);
        reconnect.scheduleReconnect(mockReconnectFn);

        expect(reconnect.timeUntilNextAttempt.value).toBeGreaterThan(0);
        expect(reconnect.timeUntilNextAttempt.value).toBeLessThanOrEqual(3000);
      });
    });

    it('should reset state correctly', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn();

        // Schedule a reconnection to set some state
        reconnect.scheduleReconnect(mockReconnectFn);

        expect(reconnect.attempts.value).toBe(1);
        expect(reconnect.isReconnecting.value).toBe(true);

        // Reset should clear everything
        reconnect.reset();

        expect(reconnect.attempts.value).toBe(0);
        expect(reconnect.isReconnecting.value).toBe(false);
        expect(reconnect.nextAttemptAt.value).toBe(null);
        expect(mockClearTimeout).toHaveBeenCalledWith(1);
      });
    });

    it('should cancel reconnect correctly', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn();

        // Schedule a reconnection
        reconnect.scheduleReconnect(mockReconnectFn);

        expect(reconnect.isReconnecting.value).toBe(true);
        expect(reconnect.nextAttemptAt.value).not.toBe(null);

        // Cancel should clear reconnecting state but keep attempts
        reconnect.cancelReconnect();

        expect(reconnect.attempts.value).toBe(1); // Attempts should remain
        expect(reconnect.isReconnecting.value).toBe(false);
        expect(reconnect.nextAttemptAt.value).toBe(null);
        expect(mockClearTimeout).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('status messages', () => {
    it('should return correct status for ready state', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);

        expect(reconnect.getStatus()).toBe('Ready to connect');
      });
    });

    it('should return correct status for reconnecting state', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn();

        reconnect.scheduleReconnect(mockReconnectFn);

        expect(reconnect.getStatus()).toBe('Reconnecting...');
      });
    });

    it('should return correct status for max attempts reached', async () => {
      testSuite.runWithContext(async () => {
        const config: ReconnectConfig = {
          maxAttempts: 1,
          delayMs: 1000,
          backoffMultiplier: 2.0,
        };

        const reconnect = useXmppReconnect(config, mockDeps);
        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);

        await reconnect.reconnectNow(mockReconnectFn);

        expect(reconnect.getStatus()).toBe('Max reconnection attempts reached');
      });
    });

    it('should return correct status with time remaining', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn();

        reconnect.scheduleReconnect(mockReconnectFn);

        // Complete the reconnection to get to "waiting for next attempt" state
        reconnect.cancelReconnect(); // This will set isReconnecting to false but keep attempts

        const status = reconnect.getStatus();
        expect(status).toMatch(/Next attempt in \d+s \(1\/5\)/);
      });
    });
  });

  describe('cleanup and lifecycle', () => {
    it('should cleanup resources on manual cleanup', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn();

        // Schedule a reconnection
        reconnect.scheduleReconnect(mockReconnectFn);

        expect(reconnect.attempts.value).toBe(1);
        expect(mockSetTimeout).toHaveBeenCalled();

        // Manual cleanup
        reconnect.cleanup();

        expect(reconnect.attempts.value).toBe(0);
        expect(reconnect.isReconnecting.value).toBe(false);
        expect(reconnect.nextAttemptAt.value).toBe(null);
        expect(mockClearTimeout).toHaveBeenCalledWith(1);
      });
    });

    it('should handle cleanup when no timeout is active', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);

        // Should not throw
        expect(() => reconnect.cleanup()).not.toThrow();
        expect(mockClearTimeout).not.toHaveBeenCalled();
      });
    });
  });

  describe('dependency injection', () => {
    it('should use default dependencies when not provided', () => {
      testSuite.runWithContext(() => {
        // This test verifies the function accepts default deps
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG);

        expect(reconnect).toBeDefined();
        expect(reconnect.attempts.value).toBe(0);
      });
    });

    it('should use injected dependencies', () => {
      testSuite.runWithContext(() => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);
        const mockReconnectFn = vi.fn();

        reconnect.scheduleReconnect(mockReconnectFn);

        expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);

        reconnect.cancelReconnect();

        expect(mockClearTimeout).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('computed properties reactivity', () => {
    it('should update reconnectState reactively', async () => {
      testSuite.runWithContext(async () => {
        const reconnect = useXmppReconnect(DEFAULT_XMPP_RECONNECT_CONFIG, mockDeps);

        const initialState = reconnect.reconnectState.value;
        expect(initialState.attempts).toBe(0);
        expect(initialState.isReconnecting).toBe(false);
        expect(initialState.nextAttemptAt).toBe(null);

        const mockReconnectFn = vi.fn().mockResolvedValue(undefined);
        reconnect.scheduleReconnect(mockReconnectFn);

        await nextTick();

        const updatedState = reconnect.reconnectState.value;
        expect(updatedState.attempts).toBe(1);
        expect(updatedState.isReconnecting).toBe(true);
        expect(updatedState.nextAttemptAt).toBeGreaterThan(Date.now());
      });
    });
  });
});
