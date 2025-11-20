#!/usr/bin/env tsx
/**
 * Timestamp Generator Tests
 *
 * Verifies that the cached timestamp generator produces valid timestamps
 * and updates at the expected frequency.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  createTimestampGenerator,
  DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS,
  timestamp,
  startTimestampGenerator,
  stopTimestampGenerator
} from './timestamp';

describe('Timestamp Generator', () => {
  // Clean up the singleton after each test to avoid interference
  afterEach(() => {
    stopTimestampGenerator();
  });

  describe('createTimestampGenerator (factory)', () => {
  it('should return a number', () => {
    const gen = createTimestampGenerator(1, DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS);
    gen.start();

    const result = gen.timestamp();

    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);

    gen.stop();
  });

  it('should update timestamp over time', async () => {
    const gen = createTimestampGenerator(10, DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS);
    gen.start();

    const firstTimestamp = gen.timestamp();

    // Wait for at least one update cycle
    await new Promise(resolve => setTimeout(resolve, 20));

    const secondTimestamp = gen.timestamp();

    expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    expect(secondTimestamp - firstTimestamp).toBeGreaterThanOrEqual(10);

    gen.stop();
  });

  it('should update at approximately the specified frequency', async () => {
    const gen = createTimestampGenerator(5, DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS);
    gen.start();

    const timestamps: number[] = [];

    // Collect timestamps over 30ms
    const startTime = Date.now();
    while (Date.now() - startTime < 30) {
      const ts = gen.timestamp();
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] !== ts) {
        timestamps.push(ts);
      }
      await new Promise(resolve => setImmediate(resolve));
    }

    // With 5ms frequency over 30ms, we expect ~6 unique timestamps
    // Allow some tolerance for timing variance
    expect(timestamps.length).toBeGreaterThanOrEqual(5);
    expect(timestamps.length).toBeLessThanOrEqual(8);

    gen.stop();
  });

  it('should return same value for multiple calls within update window', async () => {
    const gen = createTimestampGenerator(10, DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS);
    gen.start();

    // Multiple rapid calls should return same value
    const values = Array.from({ length: 1000 }, () => gen.timestamp());
    const uniqueValues = new Set(values);

    // All 1000 calls within microseconds should return same cached value
    expect(uniqueValues.size).toBe(1);

    gen.stop();
  });

  it('should stop updating after stop() is called', async () => {
    const gen = createTimestampGenerator(5, DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS);
    gen.start();

    await new Promise(resolve => setTimeout(resolve, 10));

    gen.stop();

    const timestampAfterStop = gen.timestamp();

    await new Promise(resolve => setTimeout(resolve, 20));

    const timestampMuchLater = gen.timestamp();

    // Should be frozen at same value
    expect(timestampMuchLater).toBe(timestampAfterStop);
  });

  it('should not start multiple intervals on repeated start() calls', async () => {
    const gen = createTimestampGenerator(5, DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS);

    gen.start();
    gen.start();
    gen.start();

    const firstTimestamp = gen.timestamp();

    await new Promise(resolve => setTimeout(resolve, 10));

    const secondTimestamp = gen.timestamp();

    // Should still work correctly despite multiple start calls
    expect(secondTimestamp).toBeGreaterThan(firstTimestamp);

    gen.stop();
  });

  it('should work with custom dependencies', async () => {
    let currentTime = 1000;
    const mockDeps: any = {
      now: () => currentTime,
      setInterval: (callback: () => void, delay: number) => {
        return global.setInterval(callback, delay);
      },
      clearInterval: (id: any) => {
        global.clearInterval(id);
      },
    };

    const gen = createTimestampGenerator(5, mockDeps);
    gen.start();

    expect(gen.timestamp()).toBe(1000);

    currentTime = 2000;
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(gen.timestamp()).toBe(2000);

    gen.stop();
  });
  });

  describe('Module-level singleton', () => {
    it('should provide a working timestamp function', () => {
      startTimestampGenerator();

      const result = timestamp();

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should update timestamp over time', async () => {
      startTimestampGenerator();

      const firstTimestamp = timestamp();

      // Wait for at least one update cycle (default is 10ms)
      await new Promise(resolve => setTimeout(resolve, 20));

      const secondTimestamp = timestamp();

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
      expect(secondTimestamp - firstTimestamp).toBeGreaterThanOrEqual(10);
    });

    it('should return same value for multiple rapid calls', () => {
      startTimestampGenerator();

      // Multiple rapid calls should return same cached value
      const values = Array.from({ length: 1000 }, () => timestamp());
      const uniqueValues = new Set(values);

      // All 1000 calls within microseconds should return same cached value
      expect(uniqueValues.size).toBe(1);
    });

    it('should handle multiple start calls gracefully', async () => {
      startTimestampGenerator();
      startTimestampGenerator();
      startTimestampGenerator();

      const firstTimestamp = timestamp();

      await new Promise(resolve => setTimeout(resolve, 15));

      const secondTimestamp = timestamp();

      // Should still work correctly despite multiple start calls
      expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    });

    it('should stop updating after stop is called', async () => {
      startTimestampGenerator();

      await new Promise(resolve => setTimeout(resolve, 15));

      stopTimestampGenerator();

      const timestampAfterStop = timestamp();

      await new Promise(resolve => setTimeout(resolve, 25));

      const timestampMuchLater = timestamp();

      // Should be frozen at same value
      expect(timestampMuchLater).toBe(timestampAfterStop);
    });

    it('should be restartable after stop', async () => {
      startTimestampGenerator();

      const firstTimestamp = timestamp();

      stopTimestampGenerator();

      // Restart
      startTimestampGenerator();

      await new Promise(resolve => setTimeout(resolve, 15));

      const secondTimestamp = timestamp();

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    });
  });
});
