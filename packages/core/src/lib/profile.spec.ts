import { describe, it, expect, vi } from 'vitest';
import { profile } from './profile';

describe('profile', () => {
  describe('basic functionality', () => {
    it('returns an object with result and duration', () => {
      const result = profile(() => {
        // Simple synchronous operation
        let sum = 0;
        for (let i = 0; i < 100; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('duration');
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.result).toBe(4950); // Sum of 0 to 99
    });

    it('executes the provided function', () => {
      const mockFn = vi.fn(() => 'test-result');

      const result = profile(mockFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result.result).toBe('test-result');
    });

    it('returns the function result along with timing', () => {
      const result = profile(() => {
        return 'test-result';
      });

      expect(result.result).toBe('test-result');
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('timing accuracy', () => {
    it('measures time correctly with custom now function', () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => {
        currentTime += 10; // Simulate 10ms passing each call
        return currentTime;
      });

      const result = profile(() => {
        return 'test-value';
      }, { now: mockNow });

      expect(mockNow).toHaveBeenCalledTimes(2); // Called before and after
      expect(result.duration).toBe(10); // Should be exactly 10ms difference
      expect(result.result).toBe('test-value');
    });

    it('handles longer durations correctly', () => {
      let callCount = 0;
      const mockNow = vi.fn(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1250; // 250ms difference
      });

      const result = profile(() => {
        return 42;
      }, { now: mockNow });

      expect(result.duration).toBe(250);
      expect(result.result).toBe(42);
    });

    it('handles zero duration correctly', () => {
      const mockNow = vi.fn(() => 1000); // Same time for both calls

      const result = profile(() => {
        return 'instant';
      }, { now: mockNow });

      expect(result.duration).toBe(0);
      expect(result.result).toBe('instant');
    });
  });

  describe('function execution behavior', () => {
    it('executes function with side effects', () => {
      let sideEffect = false;

      const result = profile(() => {
        sideEffect = true;
        return 'done';
      });

      expect(sideEffect).toBe(true);
      expect(result.result).toBe('done');
    });

    it('handles functions that throw errors', () => {
      expect(() => {
        profile(() => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    it('still calls now() once before function throws', () => {
      let callCount = 0;
      const mockNow = vi.fn(() => {
        callCount++;
        return callCount * 100; // 100ms difference
      });

      try {
        profile(() => {
          throw new Error('Test error');
        }, { now: mockNow });
      } catch (error) {
        expect((error as Error).message).toBe('Test error');
      }

      // Should have called now() only once (before fn() throws)
      // The second call never happens because the error propagates immediately
      expect(mockNow).toHaveBeenCalledTimes(1);
    });
  });

  describe('options handling', () => {
    it('uses performance.now by default', () => {
      const originalNow = performance.now;
      const mockPerformanceNow = vi.fn().mockReturnValue(1000);
      performance.now = mockPerformanceNow;

      try {
        const result = profile(() => 'test');
        expect(mockPerformanceNow).toHaveBeenCalledTimes(2); // Should be called twice
        expect(result.result).toBe('test');
      } finally {
        performance.now = originalNow;
      }
    });

    it('accepts custom now function via options', () => {
      const customNow = vi.fn().mockReturnValue(500);

      const result = profile(() => 'custom', { now: customNow });

      expect(customNow).toHaveBeenCalledTimes(2);
      expect(result.result).toBe('custom');
    });

    it('works with empty options object', () => {
      expect(() => {
        const result = profile(() => 'empty-options', {});
        expect(result.result).toBe('empty-options');
      }).not.toThrow();
    });

    it('works with undefined options', () => {
      expect(() => {
        const result = profile(() => 'undefined-options', undefined);
        expect(result.result).toBe('undefined-options');
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles functions that modify global state', () => {
      const originalConsoleLog = console.log;
      const mockConsoleLog = vi.fn();
      console.log = mockConsoleLog;

      try {
        const result = profile(() => {
          console.log('test message');
          return 'logged';
        });

        expect(mockConsoleLog).toHaveBeenCalledWith('test message');
        expect(result.result).toBe('logged');
        expect(typeof result.duration).toBe('number');
      } finally {
        console.log = originalConsoleLog;
      }
    });

    it('handles async functions (but does not await them)', () => {
      // Note: The profile function doesn't await async functions,
      // it just executes them synchronously and measures the sync portion
      const asyncFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async-result';
      });

      const result = profile(asyncFn);

      expect(asyncFn).toHaveBeenCalledTimes(1);
      expect(result.result).toBeInstanceOf(Promise);
      expect(typeof result.duration).toBe('number');
      // Duration should be very small since we're not awaiting the promise
      expect(result.duration).toBeLessThan(50); // Much less than the 100ms timeout
    });

    it('handles functions with complex return types', () => {
      const complexReturn = {
        data: [1, 2, 3],
        metadata: { count: 3 },
        nested: { deep: { value: 'test' } }
      };

      const complexFn = vi.fn(() => complexReturn);

      const result = profile(complexFn);

      expect(complexFn).toHaveBeenCalledTimes(1);
      expect(result.result).toEqual(complexReturn);
      expect(typeof result.duration).toBe('number');
    });

    it('handles functions that return undefined', () => {
      const result = profile(() => {
        // Function that returns undefined
      });

      expect(result.result).toBeUndefined();
      expect(typeof result.duration).toBe('number');
    });

    it('handles functions that return null', () => {
      const result = profile(() => {
        return null;
      });

      expect(result.result).toBe(null);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('performance characteristics', () => {
    it('has minimal overhead for empty function', () => {
      const result = profile(() => {
        return 'empty';
      });

      // Should be very fast, typically less than 1ms
      expect(result.duration).toBeLessThan(10);
      expect(result.result).toBe('empty');
    });
  });

  describe('type safety', () => {
    it('preserves return type information', () => {
      // Test number return type
      const numberResult = profile(() => 42);
      expect(typeof numberResult.result).toBe('number');
      expect(numberResult.result).toBe(42);

      // Test string return type
      const stringResult = profile(() => 'hello');
      expect(typeof stringResult.result).toBe('string');
      expect(stringResult.result).toBe('hello');

      // Test object return type
      const objectResult = profile(() => ({ key: 'value' }));
      expect(typeof objectResult.result).toBe('object');
      expect(objectResult.result).toEqual({ key: 'value' });

      // Test array return type
      const arrayResult = profile(() => [1, 2, 3]);
      expect(Array.isArray(arrayResult.result)).toBe(true);
      expect(arrayResult.result).toEqual([1, 2, 3]);
    });
  });
});
