import { ReplOutputInterface } from '~/repl/types';

export class NaiveConsoleOutput implements ReplOutputInterface {
  public constructor(
    private readonly console: Console = global.console,
  ) {}

  print(text: string): void {
    this.console.log(text);
  }
}

export type BatchSchedulingOutputConfig = {
  /**
   * Maximum number of items to batch before flushing
   */
  maxBatchSize: number;
  /**
   * Milliseconds
   */
  batchTimeout: number;
};

export const DEFAULT_BATCH_SCHEDULING_OUTPUT_CONFIG: BatchSchedulingOutputConfig = {
  maxBatchSize: 100,
  batchTimeout: 10,
};

/**
 * This output strategy buffers output items and flushes them according to a dual-condition
 * strategy: either the batch size is reached or the batch timeout is reached.
 */
export class BatchSchedulingOutput implements ReplOutputInterface {
  private readonly batch: string[] = [];
  private batchTimeoutId: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: BatchSchedulingOutputConfig = DEFAULT_BATCH_SCHEDULING_OUTPUT_CONFIG,
    private readonly console: Console = global.console,
  ) {}

  public print(text: string): void {
    this.batch.push(text);

    // Start timer if this is the first item in batch
    if (this.batch.length === 1 && !this.batchTimeoutId) {
      this.scheduleFlush();
    }

    // Flush immediately if batch is full
    if (this.batch.length >= this.config.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Schedule a flush after the timeout period
   */
  private scheduleFlush(): void {
    this.batchTimeoutId = setTimeout(() => {
      this.flush();
    }, this.config.batchTimeout);
  }

  /**
   * Stop batch scheduling and flush any remaining items
   */
  public stop(): void {
    if (this.batchTimeoutId) {
      clearTimeout(this.batchTimeoutId);
      this.batchTimeoutId = null;
    }
    this.flush(); // Ensure nothing is left in the batch
  }

  public flush(): void {
    if (this.batch.length === 0) return;

    // Here we amortize the cost of a single syscall across the whole batch
    this.console.log(this.batch.join('\n'));

    // Zero-allocation reset
    this.batch.length = 0;

    // Clear the timeout since we just flushed
    if (this.batchTimeoutId) {
      clearTimeout(this.batchTimeoutId);
      this.batchTimeoutId = null;
    }
  }
}
