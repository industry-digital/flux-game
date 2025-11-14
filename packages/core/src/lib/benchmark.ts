#!/usr/bin/env tsx
/**
 * Benchmark Utilities
 *
 * Reusable infrastructure for performance benchmarking.
 * Provides consistent measurement and reporting across benchmark suites.
 */

import { performance } from 'perf_hooks';

/**
 * Result from a single benchmark run
 */
export interface BenchmarkResult {
  name: string;
  throughputPerSecond: number;
  avgTimePerOp: number;
  totalTime: number;
  iterations: number;
}

export type BenchmarkDependencies = {
  highResolutionTimestamp: () => number;
  printFn: (output: string) => void;
  resultFormatter: (result: BenchmarkResult) => string;
};

const DEFAULT_RESULT_FORMATTER = (result: BenchmarkResult): string => {
  return [
    `${result.name}:`,
    `  ${result.throughputPerSecond.toFixed(2)} ops/sec`,
    `  ${result.avgTimePerOp.toFixed(4)}ms avg`,
    `  ${result.totalTime.toFixed(2)}ms total (${result.iterations.toLocaleString()} iterations)`,
  ].join('\n');
};

const DEFAULT_PRINT_FN = (output: string) => console.log(output);
const DEFAULT_HIGH_RESOLUTION_TIMESTAMP = () => performance.now();

const DEFAULT_BENCHMARK_DEPS: BenchmarkDependencies = {
  highResolutionTimestamp: DEFAULT_HIGH_RESOLUTION_TIMESTAMP,
  resultFormatter: DEFAULT_RESULT_FORMATTER,
  printFn: DEFAULT_PRINT_FN,
};

export type MeasurementInput<T = void> = {
  /**
   * Name of the measurement
   */
  name: string;

  /**
   * Number of iterations to run
   */
  iterations: number;

  /**
   * The function to run before the benchmark starts
   * Its return value is passed to fn and teardown
   */
  setup?: () => T | Promise<T>;

  /**
   * The function to be benchmarked
   * Receives the setup return value as its argument
   */
  fn: (data: T) => void | Promise<void>;

  /**
   * The function to run after the benchmark completes
   * Receives the setup return value as its argument
   */
  teardown?: (data: T) => void | Promise<void>;
};

export type BenchmarkHook = {
  measure: <T = void>(input: MeasurementInput<T>) => Promise<BenchmarkResult>;
  results: Map<string, BenchmarkResult>;
  report: () => void;
};

export const useBenchmarkSuite = (
  suiteName: string,
  results = new Map<string, BenchmarkResult>(),
  deps: BenchmarkDependencies = DEFAULT_BENCHMARK_DEPS,
): BenchmarkHook => {
  const { highResolutionTimestamp, printFn, resultFormatter } = deps;

  const measure = async <T = void>(
    { name, iterations, fn, setup, teardown }: MeasurementInput<T>,
  ) => {
    const data = setup ? await setup() : (undefined as T);

    const startTime = highResolutionTimestamp();

    for (let i = 0; i < iterations; i++) {
      const result = fn(data);
      if (result instanceof Promise) {
        await result;
      }
    }

    const endTime = highResolutionTimestamp();
    const duration = endTime - startTime;

    if (teardown) {
      await teardown(data);
    }

    const result = {
      name: `${suiteName}: ${name}`,
      totalTime: duration,
      avgTimePerOp: duration / iterations,
      throughputPerSecond: 1000 / (duration / iterations),
      iterations,
    };

    // Auto-collect results
    results.set(name, result);

    return result;
  };

  const report = () => {
    printFn('\n📊 BENCHMARK RESULTS');
    printFn('='.repeat(80));
    for (const result of results.values()) {
      printFn(resultFormatter(result));
      printFn('');
    }
  };

  return {
    measure,
    results,
    report,
  };
};
