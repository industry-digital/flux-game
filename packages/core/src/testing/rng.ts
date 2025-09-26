/**
 * Creates a deterministic RNG function for testing purposes
 * Returns values from a predefined array in sequence
 *
 * @param output Array of numbers that Math.random() would return (0-1 range)
 * @returns Function that returns sequential values from the output array
 */
export function createDeterministicRng(output: number[]): () => number {
  // Validate that all values are in valid Math.random() range
  for (const value of output) {
    if (value < 0 || value >= 1) {
      throw new Error(`Invalid RNG value: ${value}. All values must be in range [0, 1)`);
    }
  }

  let cursor = 0;

  return function deterministicRandom(): number {
    if (cursor >= output.length) {
      throw new Error(`RNG exhausted: attempted to get value at index ${cursor}, but only ${output.length} values provided`);
    }

    const value = output[cursor];
    cursor++;
    return value;
  };
}

/**
 * Creates a cycling deterministic RNG that wraps around when exhausted
 * Useful for longer test sequences where you want repeating patterns
 *
 * @param output Array of numbers that Math.random() would return (0-1 range)
 * @returns Function that returns sequential values, cycling back to start when exhausted
 */
export function createCyclingRng(output: number[]): () => number {
  // Validate that all values are in valid Math.random() range
  for (const value of output) {
    if (value < 0 || value >= 1) {
      throw new Error(`Invalid RNG value: ${value}. All values must be in range [0, 1)`);
    }
  }

  if (output.length === 0) {
    throw new Error('RNG output array cannot be empty');
  }

  let cursor = 0;

  return function cyclingRandom(): number {
    const value = output[cursor];
    cursor = (cursor + 1) % output.length;
    return value;
  };
}

/**
 * Common RNG patterns for testing
 */
export const RNG_PATTERNS = {
  /** Always returns 0.5 (middle value) */
  middle: [0.5],

  /** Always returns low values (favorable for low-is-good scenarios) */
  low: [0.1, 0.05, 0.15, 0.08],

  /** Always returns high values (favorable for high-is-good scenarios) */
  high: [0.9, 0.95, 0.85, 0.92],

  /** Alternating low/high pattern */
  alternating: [0.1, 0.9, 0.2, 0.8, 0.15, 0.85],

  /** Ascending sequence */
  ascending: [0.1, 0.3, 0.5, 0.7, 0.9],

  /** Descending sequence */
  descending: [0.9, 0.7, 0.5, 0.3, 0.1],
} as const;
