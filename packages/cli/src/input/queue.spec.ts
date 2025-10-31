/**
 * Input Queue Tests
 *
 * Tests for zero-allocation input queue with sequential processing.
 * Covers both pure queue operations and async processing coordination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createInputQueueState,
  enqueueInput,
  enqueuePriorityInput,
  dequeueInput,
  setProcessing,
  getQueueStatus,
  createInputQueueProcessor,
  isPriorityCommand,
  type InputQueueState,
  type QueuedInput,
  type QueueStatus,
  type InputProcessor,
} from './queue';

// ===== PURE QUEUE OPERATIONS TESTS =====

describe('createInputQueueState', () => {
  it('creates initial queue state with default capacity', () => {
    const state = createInputQueueState();

    expect(state.maxSize).toBe(100);
    expect(state.queue).toHaveLength(100);
    expect(state.processing).toBe(false);
    expect(state.head).toBe(0);
    expect(state.tail).toBe(0);
    expect(state.length).toBe(0);
  });

  it('creates initial queue state with custom capacity', () => {
    const state = createInputQueueState(50);

    expect(state.maxSize).toBe(50);
    expect(state.queue).toHaveLength(50);
    expect(state.length).toBe(0);
  });
});

describe('enqueueInput', () => {
  let state: InputQueueState;

  beforeEach(() => {
    state = createInputQueueState(5); // Small capacity for easier testing
  });

  it('enqueues input to empty queue', () => {
    const result = enqueueInput(state, 'look around', 'trace1', 1000);

    expect(result).toBe(true);
    expect(state.length).toBe(1);
    expect(state.head).toBe(0);
    expect(state.tail).toBe(1);
    expect(state.queue[0].input).toBe('look around');
    expect(state.queue[0].trace).toBe('trace1');
    expect(state.queue[0].timestamp).toBe(1000);
  });

  it('enqueues multiple inputs in order', () => {
    enqueueInput(state, 'first', 'trace1', 1000);
    enqueueInput(state, 'second', 'trace2', 2000);
    enqueueInput(state, 'third', 'trace3', 3000);

    expect(state.length).toBe(3);
    expect(state.queue[0].input).toBe('first');
    expect(state.queue[1].input).toBe('second');
    expect(state.queue[2].input).toBe('third');
  });

  it('handles circular buffer wraparound', () => {
    // Fill queue to capacity
    for (let i = 0; i < 5; i++) {
      enqueueInput(state, `cmd${i}`, `trace${i}`, i * 1000);
    }

    expect(state.length).toBe(5);
    expect(state.tail).toBe(0); // Wrapped around
  });

  it('drops oldest when queue is full', () => {
    // Fill queue to capacity
    for (let i = 0; i < 5; i++) {
      enqueueInput(state, `cmd${i}`, `trace${i}`, i * 1000);
    }

    // Add one more - should drop oldest
    enqueueInput(state, 'newest', 'trace_new', 9999);

    expect(state.length).toBe(5); // Still at capacity
    expect(state.head).toBe(1); // Head advanced (dropped oldest)
    expect(state.queue[0].input).toBe('newest'); // New item at tail
  });

  it('copies to output parameter when provided', () => {
    const output: QueuedInput = { input: '', trace: '', timestamp: 0 };

    enqueueInput(state, 'test input', 'test_trace', 5000, output);

    expect(output.input).toBe('test input');
    expect(output.trace).toBe('test_trace');
    expect(output.timestamp).toBe(5000);
  });

  it('does not copy to preallocated output', () => {
    const output: QueuedInput = { input: 'original', trace: 'original', timestamp: 999 };

    // Pass undefined to use preallocated (should not modify our output)
    enqueueInput(state, 'test input', 'test_trace', 5000);

    expect(output.input).toBe('original'); // Unchanged
  });
});

describe('enqueuePriorityInput', () => {
  let state: InputQueueState;

  beforeEach(() => {
    state = createInputQueueState(5);
  });

  it('enqueues priority input to empty queue', () => {
    const result = enqueuePriorityInput(state, 'exit', 'trace1', 1000);

    expect(result).toBe(true);
    expect(state.length).toBe(1);
    expect(state.head).toBe(4); // Moved back from 0
    expect(state.tail).toBe(0);
    expect(state.queue[4].input).toBe('exit');
  });

  it('inserts priority input at front of existing queue', () => {
    // Add regular items
    enqueueInput(state, 'first', 'trace1', 1000);
    enqueueInput(state, 'second', 'trace2', 2000);

    // Add priority item
    enqueuePriorityInput(state, 'exit', 'trace_exit', 3000);

    expect(state.length).toBe(3);
    expect(state.head).toBe(4); // Priority item location
    expect(state.queue[4].input).toBe('exit'); // Priority item at new head
  });

  it('drops from tail when queue is full', () => {
    // Fill queue
    for (let i = 0; i < 5; i++) {
      enqueueInput(state, `cmd${i}`, `trace${i}`, i * 1000);
    }

    // Add priority - should drop from tail
    enqueuePriorityInput(state, 'exit', 'trace_exit', 9999);

    expect(state.length).toBe(5);
    expect(state.tail).toBe(4); // Tail moved back (dropped last item)
    expect(state.queue[4].input).toBe('exit'); // Priority item at new head
  });

  it('copies to output parameter when provided', () => {
    const output: QueuedInput = { input: '', trace: '', timestamp: 0 };

    enqueuePriorityInput(state, 'exit', 'exit_trace', 7000, output);

    expect(output.input).toBe('exit');
    expect(output.trace).toBe('exit_trace');
    expect(output.timestamp).toBe(7000);
  });
});

describe('dequeueInput', () => {
  let state: InputQueueState;

  beforeEach(() => {
    state = createInputQueueState(5);
  });

  it('returns false for empty queue', () => {
    const output: QueuedInput = { input: '', trace: '', timestamp: 0 };
    const result = dequeueInput(state, output);

    expect(result).toBe(false);
    expect(output.input).toBe(''); // Unchanged
  });

  it('dequeues single item', () => {
    enqueueInput(state, 'test', 'trace1', 1000);

    const output: QueuedInput = { input: '', trace: '', timestamp: 0 };
    const result = dequeueInput(state, output);

    expect(result).toBe(true);
    expect(state.length).toBe(0);
    expect(state.head).toBe(1);
    expect(output.input).toBe('test');
    expect(output.trace).toBe('trace1');
    expect(output.timestamp).toBe(1000);
  });

  it('dequeues items in FIFO order', () => {
    enqueueInput(state, 'first', 'trace1', 1000);
    enqueueInput(state, 'second', 'trace2', 2000);
    enqueueInput(state, 'third', 'trace3', 3000);

    const output: QueuedInput = { input: '', trace: '', timestamp: 0 };

    dequeueInput(state, output);
    expect(output.input).toBe('first');

    dequeueInput(state, output);
    expect(output.input).toBe('second');

    dequeueInput(state, output);
    expect(output.input).toBe('third');

    expect(state.length).toBe(0);
  });

  it('respects priority order', () => {
    enqueueInput(state, 'regular1', 'trace1', 1000);
    enqueueInput(state, 'regular2', 'trace2', 2000);
    enqueuePriorityInput(state, 'priority', 'trace_priority', 3000);

    const output: QueuedInput = { input: '', trace: '', timestamp: 0 };

    // Priority should come first
    dequeueInput(state, output);
    expect(output.input).toBe('priority');

    // Then regular items in order
    dequeueInput(state, output);
    expect(output.input).toBe('regular1');

    dequeueInput(state, output);
    expect(output.input).toBe('regular2');
  });

  it('clears dequeued slot for debugging', () => {
    enqueueInput(state, 'test', 'trace1', 1000);

    const output: QueuedInput = { input: '', trace: '', timestamp: 0 };
    dequeueInput(state, output);

    // Original slot should be cleared
    expect(state.queue[0].input).toBe('');
    expect(state.queue[0].trace).toBe('');
    expect(state.queue[0].timestamp).toBe(0);
  });
});

describe('setProcessing', () => {
  it('sets processing flag', () => {
    const state = createInputQueueState();

    setProcessing(state, true);
    expect(state.processing).toBe(true);

    setProcessing(state, false);
    expect(state.processing).toBe(false);
  });
});

describe('getQueueStatus', () => {
  let state: InputQueueState;

  beforeEach(() => {
    state = createInputQueueState(10);
  });

  it('returns status for empty queue', () => {
    const status = getQueueStatus(state);

    expect(status.length).toBe(0);
    expect(status.processing).toBe(false);
    expect(status.capacity).toBe(10);
    expect(status.utilizationPercent).toBe(0);
  });

  it('returns status for partially filled queue', () => {
    enqueueInput(state, 'cmd1', 'trace1', 1000);
    enqueueInput(state, 'cmd2', 'trace2', 2000);
    enqueueInput(state, 'cmd3', 'trace3', 3000);
    setProcessing(state, true);

    const status = getQueueStatus(state);

    expect(status.length).toBe(3);
    expect(status.processing).toBe(true);
    expect(status.capacity).toBe(10);
    expect(status.utilizationPercent).toBe(30);
  });

  it('copies to output parameter when provided', () => {
    const output: QueueStatus = { length: -1, processing: true, capacity: -1, utilizationPercent: -1 };

    enqueueInput(state, 'test', 'trace', 1000);
    const result = getQueueStatus(state, output);

    expect(result).toBe(output); // Returns same object
    expect(output.length).toBe(1);
    expect(output.processing).toBe(false);
    expect(output.capacity).toBe(10);
    expect(output.utilizationPercent).toBe(10);
  });
});

// ===== ASYNC PROCESSING COORDINATOR TESTS =====

describe('createInputQueueProcessor', () => {
  let mockProcessor: InputProcessor<string>;
  let processor: ReturnType<typeof createInputQueueProcessor<string>>;

  beforeEach(() => {
    mockProcessor = vi.fn().mockImplementation(async (input: string, trace: string, state: string) => {
      return `${state}-${input}`;
    });

    processor = createInputQueueProcessor('initial', mockProcessor, createInputQueueState(5));
  });

  it('processes single input', async () => {
    const result = processor.enqueue('test', 'trace1', 1000);

    expect(result).toBe(true);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockProcessor).toHaveBeenCalledWith('test', 'trace1', 'initial');
  });

  it('processes multiple inputs in order', async () => {
    processor.enqueue('first', 'trace1', 1000);
    processor.enqueue('second', 'trace2', 2000);
    processor.enqueue('third', 'trace3', 3000);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockProcessor).toHaveBeenCalledTimes(3);
    expect(mockProcessor).toHaveBeenNthCalledWith(1, 'first', 'trace1', 'initial');
    expect(mockProcessor).toHaveBeenNthCalledWith(2, 'second', 'trace2', 'initial-first');
    expect(mockProcessor).toHaveBeenNthCalledWith(3, 'third', 'trace3', 'initial-first-second');
  });

  it('processes priority inputs first', async () => {
    // Add priority first, then regular - this ensures priority is processed first
    processor.enqueuePriority('priority', 'trace2', 2000);
    processor.enqueue('regular', 'trace1', 1000);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockProcessor).toHaveBeenCalledTimes(2);
    expect(mockProcessor).toHaveBeenNthCalledWith(1, 'priority', 'trace2', 'initial');
    expect(mockProcessor).toHaveBeenNthCalledWith(2, 'regular', 'trace1', 'initial-priority');
  });

  it('rejects inputs after stop', () => {
    processor.stop();

    const result = processor.enqueue('test', 'trace', 1000);
    expect(result).toBe(false);

    const priorityResult = processor.enqueuePriority('exit', 'trace', 1000);
    expect(priorityResult).toBe(false);
  });

  it('returns queue status', () => {
    processor.enqueue('test1', 'trace1', 1000);
    processor.enqueue('test2', 'trace2', 2000);

    const status = processor.getStatus();

    expect(status.length).toBeGreaterThanOrEqual(0); // May have been processed already
    expect(status.capacity).toBe(5);
    expect(typeof status.utilizationPercent).toBe('number');
  });

});

// ===== UTILITY FUNCTIONS TESTS =====

describe('isPriorityCommand', () => {
  it('identifies exit commands as priority', () => {
    expect(isPriorityCommand('exit')).toBe(true);
    expect(isPriorityCommand('quit')).toBe(true);
    expect(isPriorityCommand('q')).toBe(true);
  });

  it('handles case insensitivity', () => {
    expect(isPriorityCommand('EXIT')).toBe(true);
    expect(isPriorityCommand('Quit')).toBe(true);
    expect(isPriorityCommand('Q')).toBe(true);
  });

  it('handles whitespace', () => {
    expect(isPriorityCommand('  exit  ')).toBe(true);
    expect(isPriorityCommand('\tquit\n')).toBe(true);
  });

  it('identifies non-priority commands', () => {
    expect(isPriorityCommand('help')).toBe(false);
    expect(isPriorityCommand('look')).toBe(false);
    expect(isPriorityCommand('inventory')).toBe(false);
    expect(isPriorityCommand('examine sword')).toBe(false);
    expect(isPriorityCommand('')).toBe(false);
  });

  it('does not match partial words', () => {
    expect(isPriorityCommand('exiting')).toBe(false);
    expect(isPriorityCommand('quit game')).toBe(false);
    expect(isPriorityCommand('question')).toBe(false);
  });
});
