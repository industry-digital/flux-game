/**
 * Integration Benchmark - Functional Core Throughput
 *
 * Measures the performance of the pure functional core:
 * input → runPipeline → processCommand → effects
 *
 * Bypasses all imperative shell concerns (I/O, async coordination, etc.)
 * to focus purely on computational throughput.
 */

import { performance } from 'perf_hooks';
import { createTransformerContext, ActorURN, createIntent, executeIntent, IntentInput } from '@flux/core';
import { createReplState } from './state';
import { runPipeline } from './input/pipeline';
import { processCommand } from './command';
import { DEFAULT_PIPELINE } from './input/processors';
import { ReplEffect, ReplState } from './types';
import { ProcessGameCommandDependencies } from './command';
import { loadScenario, resolveScenarioId } from '~/scenario/registry';
import * as memo from './memo';

// ===== BENCHMARK SETUP =====

const setupBenchmarkState = (): {
  state: ReplState;
  commandDeps: ProcessGameCommandDependencies;
  effectsBuffer: ReplEffect[];
} => {
  // Create context and load default scenario
  const context = createTransformerContext();
  const scenarioId = resolveScenarioId();

  let currentActor: ActorURN | undefined;
  const scenario = loadScenario(context, scenarioId, (actorId: ActorURN) => {
    currentActor = actorId;
  });

  // Create state with loaded scenario
  const state = createReplState(context, scenario);
  if (currentActor) {
    state.currentActor = currentActor;
  }

  // Initialize memo from world state
  memo.initializeMemoFromWorld(state.memo, state.context.world.actors);

  // Create command dependencies
  const commandDeps: ProcessGameCommandDependencies = {
    // Memo operations
    getActorSession: memo.getActorSession,
    getActorLocation: memo.getActorLocation,
    setActorSession: memo.setActorSession,
    removeActorSession: memo.removeActorSession,
    setActorLocation: memo.setActorLocation,

    // Core operations
    executeIntent: executeIntent,
    createIntent: (input: IntentInput) => createIntent(input),
  };

  // Pre-allocated effects buffer for zero-allocation benchmarking
  const effectsBuffer: ReplEffect[] = new Array(50); // Pre-allocate reasonable size

  return { state, commandDeps, effectsBuffer };
};

// ===== BENCHMARK UTILITIES =====

type BenchmarkResult = {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  opsPerSec: number;
  minTime: number;
  maxTime: number;
};

const runBenchmark = (
  name: string,
  fn: () => void,
  iterations: number = 10000
): BenchmarkResult => {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    fn();
  }

  // Actual benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();
    fn();
    const iterEnd = performance.now();
    times.push(iterEnd - iterStart);
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  const opsPerSec = Math.round(1000 / avgTime);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    opsPerSec,
    minTime,
    maxTime,
  };
};

const printResult = (result: BenchmarkResult): void => {
  console.log(`${result.name}:`);
  console.log(`  Iterations: ${result.iterations.toLocaleString()}`);
  console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`);
  console.log(`  Avg time: ${result.avgTime.toFixed(4)}ms`);
  console.log(`  Ops/sec: ${result.opsPerSec.toLocaleString()}`);
  console.log(`  Min time: ${result.minTime.toFixed(4)}ms`);
  console.log(`  Max time: ${result.maxTime.toFixed(4)}ms`);
  console.log();
};

// ===== BENCHMARK FUNCTIONS =====

const benchmarkCompletePipeline = (
  state: ReplState,
  commandDeps: ProcessGameCommandDependencies,
  effectsBuffer: ReplEffect[]
): void => {
  console.log('🔥 FUNCTIONAL CORE PIPELINE BENCHMARKS\n');

  const testInput = 'look bob';
  const testTrace = 'benchmarkTrace123';

  // Complete pipeline benchmark
  const completeResult = runBenchmark(
    'Complete functional pipeline: input → command → effects',
    () => {
      const command = runPipeline(testInput, undefined, DEFAULT_PIPELINE, testTrace);
      processCommand(state, command, effectsBuffer, commandDeps);
      effectsBuffer.length = 0;
    }
  );
  printResult(completeResult);

  // Input parsing only
  const parsingResult = runBenchmark(
    'Input parsing only: input → command',
    () => {
      runPipeline(testInput, undefined, DEFAULT_PIPELINE, testTrace);
    }
  );
  printResult(parsingResult);

  // Command processing only
  const command = runPipeline(testInput, undefined, DEFAULT_PIPELINE, testTrace);
  const processingResult = runBenchmark(
    'Command processing only: command → effects',
    () => {
      processCommand(state, command, effectsBuffer, commandDeps);
      effectsBuffer.length = 0;
    }
  );
  printResult(processingResult);

  // Game engine execution only
  const actorLocation = commandDeps.getActorLocation(state.memo, state.currentActor!);
  const actorSession = commandDeps.getActorSession(state.memo, state.currentActor!);
  const intent = commandDeps.createIntent({
    id: testTrace,
    actor: state.currentActor!,
    location: actorLocation!,
    session: actorSession,
    text: testInput,
  });

  const gameEngineResult = runBenchmark(
    'Game engine execution: intent → context',
    () => {
      state.context.resetEvents();
      state.context.resetErrors();
      const updatedContext = commandDeps.executeIntent(state.context, intent);
      state.context = updatedContext;
    }
  );
  printResult(gameEngineResult);
};

const benchmarkThroughput = (
  state: ReplState,
  commandDeps: ProcessGameCommandDependencies,
  effectsBuffer: ReplEffect[]
): void => {
  console.log('🚀 THROUGHPUT BENCHMARKS\n');

  // Batch processing benchmarks for 'look bob' only
  const batch100Result = runBenchmark(
    'Batch processing: 100 look bob commands',
    () => {
      for (let i = 0; i < 100; i++) {
        const command = runPipeline('look bob', undefined, DEFAULT_PIPELINE, `trace${i}`);
        processCommand(state, command, effectsBuffer, commandDeps);
        effectsBuffer.length = 0;
      }
    },
    100 // Lower iterations since each iteration does 100 commands
  );
  printResult(batch100Result);

  const batch1000Result = runBenchmark(
    'Batch processing: 1000 look bob commands',
    () => {
      for (let i = 0; i < 1000; i++) {
        const command = runPipeline('look bob', undefined, DEFAULT_PIPELINE, `trace${i}`);
        processCommand(state, command, effectsBuffer, commandDeps);
        effectsBuffer.length = 0;
      }
    },
    10 // Lower iterations since each iteration does 1000 commands
  );
  printResult(batch1000Result);
};

// ===== MAIN BENCHMARK RUNNER =====

export const runAllBenchmarks = (): void => {
  console.log('🎯 FUNCTIONAL CORE INTEGRATION BENCHMARKS');
  console.log('==========================================\n');

  console.log('🏗️  Setting up benchmark environment...');
  const { state, commandDeps, effectsBuffer } = setupBenchmarkState();
  console.log('✅ Environment ready!\n');

  benchmarkCompletePipeline(state, commandDeps, effectsBuffer);
  benchmarkThroughput(state, commandDeps, effectsBuffer);

  console.log('📈 PERFORMANCE SUMMARY:');
  console.log('- Functional core isolated from imperative shell ✅');
  console.log('- Zero-allocation effect buffer reuse ✅');
  console.log('- Real-world scenario testing (look bob) ✅');
  console.log();
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBenchmarks();
}
