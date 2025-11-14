/**
 * High-performance timestamp generator.
 * Amortizes the cost of syscalls by caching the timestamp and updating it at a regular interval.
 * Measured throughput at 200M+ ops/sec on Apple Silicon.
 * Uses unref() to allow graceful shutdown.
 */

export type TimestampFn = () => number;

export type TimestampGeneratorDependencies = {
  now: () => number,
  setInterval: (callback: (...args: any) => void, delay?: number) => any;
  clearInterval: (timeout: NodeJS.Timeout | string | number | undefined) => void;
};

export const DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS: TimestampGeneratorDependencies = {
  now: () => Date.now(),
  setInterval: (callback, delay) => global.setInterval(callback, delay),
  clearInterval: (timeout) => global.clearInterval(timeout),
};

export type TimestampGenerator = {
  timestamp: TimestampFn;
  start: () => void;
  stop: () => void;
};

const DEFAULT_FREQUENCY = 10; // milliseconds


export const createTimestampGenerator = (
  frequency: number = DEFAULT_FREQUENCY,
  deps: TimestampGeneratorDependencies = DEFAULT_TIMESTAMP_GENERATOR_FACTORY_DEPS,
): TimestampGenerator => {
  let interval: NodeJS.Timeout | undefined;
  let currentTimestamp: number = deps.now();

  const updateTimestamp = () => {
    currentTimestamp = deps.now();
  };

  const start = () => {
    if (interval !== undefined) {
      return;
    }
    updateTimestamp();
    interval = deps.setInterval(updateTimestamp, frequency);
    interval?.unref();
  };

  const stop = () => {
    deps.clearInterval(interval);
    interval = undefined;
  };

  const timestamp = () => currentTimestamp;

  return {
    timestamp,
    start,
    stop,
  };
};
