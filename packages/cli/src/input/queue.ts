/**
 * Input Queue - Sequential Processing with Buffering
 *
 * Ensures commands execute in arrival order, preventing race conditions
 * when users type faster than commands can be processed.
 *
 * Zero-allocation design with direct mutation and output parameters.
 * Follows the same pattern as other performance-critical modules in this codebase.
 */

export type QueuedInput = {
  input: string;
  trace: string;
  timestamp: number;
};

export type InputQueueState = {
  queue: QueuedInput[];
  processing: boolean;
  maxSize: number;
  head: number; // Circular buffer head pointer
  tail: number; // Circular buffer tail pointer
  length: number; // Current queue length
};

export type QueueStatus = {
  length: number;
  processing: boolean;
  capacity: number;
  utilizationPercent: number;
};

// ===== ZERO-ALLOCATION QUEUE OPERATIONS =====

export const createInputQueueState = (maxSize = 100): InputQueueState => ({
  queue: new Array(maxSize), // Pre-allocate circular buffer
  processing: false,
  maxSize,
  head: 0,
  tail: 0,
  length: 0,
});

// Preallocated objects for reuse
const PREALLOCATED_QUEUED_INPUT: QueuedInput = { input: '', trace: '', timestamp: 0 };
const PREALLOCATED_QUEUE_STATUS: QueueStatus = { length: 0, processing: false, capacity: 0, utilizationPercent: 0 };

export const enqueueInput = (
  state: InputQueueState,
  input: string,
  trace: string,
  timestamp: number,
  output: QueuedInput = PREALLOCATED_QUEUED_INPUT,
): boolean => {
  // Check if queue is full
  if (state.length >= state.maxSize) {
    // Drop oldest by advancing head (circular buffer behavior)
    state.head = (state.head + 1) % state.maxSize;
    state.length--;
  }

  // Reuse existing object at tail position or create new one
  const queuedInput = state.queue[state.tail] || { input: '', trace: '', timestamp: 0 };
  queuedInput.input = input;
  queuedInput.trace = trace;
  queuedInput.timestamp = timestamp;

  state.queue[state.tail] = queuedInput;
  state.tail = (state.tail + 1) % state.maxSize;
  state.length++;

  // Copy to output if provided
  if (output !== PREALLOCATED_QUEUED_INPUT) {
    output.input = input;
    output.trace = trace;
    output.timestamp = timestamp;
  }

  return true;
};

export const enqueuePriorityInput = (
  state: InputQueueState,
  input: string,
  trace: string,
  timestamp: number,
  output: QueuedInput = PREALLOCATED_QUEUED_INPUT,
): boolean => {
  // Check if queue is full
  if (state.length >= state.maxSize) {
    // For priority, drop from tail instead of head
    state.tail = state.tail === 0 ? state.maxSize - 1 : state.tail - 1;
    state.length--;
  }

  // Move head back to insert at front
  state.head = state.head === 0 ? state.maxSize - 1 : state.head - 1;

  // Reuse existing object at new head position
  const queuedInput = state.queue[state.head] || { input: '', trace: '', timestamp: 0 };
  queuedInput.input = input;
  queuedInput.trace = trace;
  queuedInput.timestamp = timestamp;

  state.queue[state.head] = queuedInput;
  state.length++;

  // Copy to output if provided
  if (output !== PREALLOCATED_QUEUED_INPUT) {
    output.input = input;
    output.trace = trace;
    output.timestamp = timestamp;
  }

  return true;
};

export const dequeueInput = (
  state: InputQueueState,
  output: QueuedInput = PREALLOCATED_QUEUED_INPUT,
): boolean => {
  if (state.length === 0) {
    return false;
  }

  const queuedInput = state.queue[state.head];

  // Copy to output
  output.input = queuedInput.input;
  output.trace = queuedInput.trace;
  output.timestamp = queuedInput.timestamp;

  // Clear the slot (optional, for debugging)
  queuedInput.input = '';
  queuedInput.trace = '';
  queuedInput.timestamp = 0;

  // Advance head pointer
  state.head = (state.head + 1) % state.maxSize;
  state.length--;

  return true;
};

export const setProcessing = (state: InputQueueState, processing: boolean): void => {
  state.processing = processing;
};

export const getQueueStatus = (
  state: InputQueueState,
  output: QueueStatus = PREALLOCATED_QUEUE_STATUS,
): QueueStatus => {
  output.length = state.length;
  output.processing = state.processing;
  output.capacity = state.maxSize;
  output.utilizationPercent = Math.round((state.length / state.maxSize) * 100);
  return output;
};

// ===== IMPERATIVE SHELL - ASYNC PROCESSING COORDINATOR =====

export type InputProcessor<TState> = (
  input: string,
  trace: string,
  state: TState,
) => Promise<TState>;

export type InputQueueProcessor<TState> = {
  enqueue: (input: string, trace: string, timestamp: number) => boolean;
  enqueuePriority: (input: string, trace: string, timestamp: number) => boolean;
  getStatus: (output?: QueueStatus) => QueueStatus;
  stop: () => void;
};

export const createInputQueueProcessor = <TState>(
  initialState: TState,
  processor: InputProcessor<TState>,
  queueState = createInputQueueState(),
): InputQueueProcessor<TState> => {
  let currentAppState = initialState;
  let stopRequested = false;

  // Preallocated objects for zero-allocation processing
  const processingInput: QueuedInput = { input: '', trace: '', timestamp: 0 };
  const statusOutput: QueueStatus = { length: 0, processing: false, capacity: 0, utilizationPercent: 0 };

  const processNext = async (): Promise<void> => {
    if (queueState.processing || stopRequested) {
      return;
    }

    setProcessing(queueState, true);

    try {
      while (queueState.length > 0 && !stopRequested) {
        const hasInput = dequeueInput(queueState, processingInput);

        if (hasInput) {
          // Process the input with the application state
          currentAppState = await processor(
            processingInput.input,
            processingInput.trace,
            currentAppState
          );
        }
      }
    } finally {
      setProcessing(queueState, false);
    }
  };

  const enqueue = (input: string, trace: string, timestamp: number): boolean => {
    if (stopRequested) {
      return false;
    }

    enqueueInput(queueState, input, trace, timestamp);

    // Start processing if not already running
    processNext();

    return true;
  };

  const enqueuePriority = (input: string, trace: string, timestamp: number): boolean => {
    if (stopRequested) {
      return false;
    }

    enqueuePriorityInput(queueState, input, trace, timestamp);

    // Start processing if not already running
    processNext();

    return true;
  };

  const getStatus = (output: QueueStatus = statusOutput): QueueStatus => {
    return getQueueStatus(queueState, output);
  };

  const stop = () => {
    stopRequested = true;
  };

  return {
    enqueue,
    enqueuePriority,
    getStatus,
    stop,
  };
};

// ===== UTILITY FUNCTIONS =====

export const isPriorityCommand = (input: string): boolean => {
  const command = input.trim().toLowerCase();
  return command === 'exit' || command === 'quit' || command === 'q';
};
