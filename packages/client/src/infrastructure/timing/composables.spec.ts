import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useExponentialBackoff, type TimingDependencies, type BackoffConfig } from './composables';
import { createComposableTestSuite } from '~/testing';

describe('useExponentialBackoff', () => {
  const testSuite = createComposableTestSuite();

  // Mock timing dependencies
  let mockSetTimeout: ReturnType<typeof vi.fn>;
  let mockClearTimeout: ReturnType<typeof vi.fn>;
  let mockNow: ReturnType<typeof vi.fn>;
  let mockDeps: TimingDependencies;
  let currentTime: number;

  beforeEach(() => {
    testSuite.setup();

    currentTime = 1000;
    mockSetTimeout = vi.fn();
    mockClearTimeout = vi.fn();
    mockNow = vi.fn(() => currentTime);

    mockDeps = {
      setTimeout: mockSetTimeout as unknown as typeof setTimeout,
      clearTimeout: mockClearTimeout as unknown as typeof clearTimeout,
      now: mockNow,
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    testSuite.teardown();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      testSuite.runWithContext(() => {
        const backoff = useExponentialBackoff({}, mockDeps);

        expect(backoff.isWaiting.value).toBe(false);
        expect(backoff.canAttempt.value).toBe(true);
        expect(backoff.getStatus()).toBe('Ready');
      });
    });

    it('should merge custom config with defaults', () => {
      testSuite.runWithContext(() => {
        const customConfig: Partial<BackoffConfig> = {
          initialDelayMs: 500,
          maxAttempts: 3,
          jitterMs: 0, // Disable jitter for predictable tests
        };

        const backoff = useExponentialBackoff(customConfig, mockDeps);

        // Should initialize correctly with custom config
        expect(backoff.canAttempt.value).toBe(true);
        expect(backoff.isWaiting.value).toBe(false);
        expect(backoff.getStatus()).toBe('Ready');
      });
    });
  });


  describe('attempt scheduling', () => {
    it('should schedule attempt with correct delay', () => {
      testSuite.runWithContext(() => {
        const config: Partial<BackoffConfig> = {
          initialDelayMs: 2000,
          jitterMs: 0,
        };

        const backoff = useExponentialBackoff(config, mockDeps);
        const callback = vi.fn();

        backoff.scheduleAttempt(callback);

        expect(backoff.isWaiting.value).toBe(true);
        expect(backoff.canAttempt.value).toBe(false);
        expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
      });
    });

    it('should execute callback after delay', async () => {
      testSuite.runWithContext(() => {
        const backoff = useExponentialBackoff({}, mockDeps);
        const callback = vi.fn().mockResolvedValue(undefined);

        backoff.scheduleAttempt(callback);

        // Get the scheduled callback
        const scheduledCallback = mockSetTimeout.mock.calls[0][0];

        // Execute it
        scheduledCallback();

        expect(callback).toHaveBeenCalled();
        expect(backoff.isWaiting.value).toBe(false);
        expect(backoff.canAttempt.value).toBe(true);
      });
    });

    it('should throw when max attempts reached', () => {
      testSuite.runWithContext(() => {
        const config: Partial<BackoffConfig> = {
          maxAttempts: 1,
        };

        const backoff = useExponentialBackoff(config, mockDeps);
        const callback = vi.fn();

        // First attempt should work
        backoff.scheduleAttempt(callback);
        expect(backoff.isWaiting.value).toBe(true);
        expect(backoff.canAttempt.value).toBe(false);

        // Execute the callback to complete the attempt
        const scheduledCallback = mockSetTimeout.mock.calls[0][0];
        scheduledCallback();

        // Now canAttempt should be false (max attempts reached)
        expect(backoff.canAttempt.value).toBe(false);
        expect(() => backoff.scheduleAttempt(callback)).toThrow('Cannot schedule attempt: max attempts reached');
      });
    });

    it('should throw when already waiting', () => {
      testSuite.runWithContext(() => {
        const backoff = useExponentialBackoff({}, mockDeps);
        const callback = vi.fn();

        backoff.scheduleAttempt(callback);

        expect(() => backoff.scheduleAttempt(callback)).toThrow('Cannot schedule attempt: max attempts reached or already waiting');
      });
    });
  });



  describe('reset', () => {
    it('should reset all state', () => {
      testSuite.runWithContext(() => {
        const backoff = useExponentialBackoff({}, mockDeps);
        const callback = vi.fn();

        // Make an attempt
        backoff.scheduleAttempt(callback);
        expect(backoff.isWaiting.value).toBe(true);
        expect(backoff.canAttempt.value).toBe(false);

        backoff.reset();

        expect(backoff.isWaiting.value).toBe(false);
        expect(backoff.canAttempt.value).toBe(true);
        expect(backoff.getStatus()).toBe('Ready');
      });
    });
  });

  describe('status reporting', () => {
    it('should return correct status messages', () => {
      testSuite.runWithContext(() => {
        const config: Partial<BackoffConfig> = {
          maxAttempts: 2,
          initialDelayMs: 1000,
          jitterMs: 0,
        };

        const backoff = useExponentialBackoff(config, mockDeps);
        const callback = vi.fn();

        // Initial state
        expect(backoff.getStatus()).toBe('Ready');

        // After first attempt
        backoff.scheduleAttempt(callback);
        expect(backoff.getStatus()).toContain('Waiting');
        expect(backoff.getStatus()).toContain('attempt 1/2');

        // Complete first attempt
        const scheduledCallback = mockSetTimeout.mock.calls[0][0];
        scheduledCallback();

        // Should show ready to retry
        expect(backoff.getStatus()).toContain('Ready to retry');
        expect(backoff.getStatus()).toContain('attempt 1/2');

        // Make second attempt (reaches max)
        backoff.scheduleAttempt(callback);
        const secondCallback = mockSetTimeout.mock.calls[1][0];
        secondCallback();

        // Should show max attempts reached
        expect(backoff.getStatus()).toContain('Max attempts reached');
        expect(backoff.getStatus()).toContain('2/2');
      });
    });
  });

});
