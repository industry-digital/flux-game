// Cross-platform random bytes generation - detect environment once at module load
const getRandomBytes = (() => {
  // Browser environment - use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    return (count: number): Uint8Array => {
      const bytes = new Uint8Array(count);
      window.crypto.getRandomValues(bytes);
      return bytes;
    };
  }

  // Fallback for other environments (like Web Workers)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return (count: number): Uint8Array => {
      const bytes = new Uint8Array(count);
      crypto.getRandomValues(bytes);
      return bytes;
    };
  }

  // Node.js environment - use crypto module
  try {
    // Dynamic import for Node.js crypto module
    const cryptoModule = (globalThis as any)?.require?.('crypto');
    if (cryptoModule && cryptoModule.randomBytes) {
      return (count: number): Uint8Array => {
        return new Uint8Array(cryptoModule.randomBytes(count));
      };
    }
  } catch (error) {
    // Fall through to error below
  }

  // No secure random number generator available
  return (count: number): Uint8Array => {
    throw new Error('No secure random number generator available');
  };
})();

interface RandomBytesStrategy {
  getRandomBytes(count: number): Uint8Array;
}

interface ByteProvider {
  getBytes(count: number): Uint8Array;
}

class DefaultRandomBytesStrategy implements RandomBytesStrategy {
  getRandomBytes(count: number): Uint8Array {
    return getRandomBytes(count);
  }
}

class BytePool implements ByteProvider {
  private buffer: Uint8Array;
  private position = 0;

  constructor(
    private readonly poolSize = 1024,
    private readonly randomBytesStrategy: RandomBytesStrategy = new DefaultRandomBytesStrategy()
  ) {
    // Pre-allocate buffer to avoid allocation in constructor
    this.buffer = new Uint8Array(poolSize);
    this.refill();
  }

  getBytes(count: number): Uint8Array {
    // Handle requests larger than pool size
    if (count > this.poolSize) {
      return this.randomBytesStrategy.getRandomBytes(count);
    }

    // Check if we need to refill
    if (this.position + count > this.buffer.length) {
      this.refill();
    }

    // Return a view into the buffer - no allocation
    const result = this.buffer.subarray(this.position, this.position + count);
    this.position += count;
    return result;
  }

  private refill(): void {
    // Reuse existing buffer - no allocation
    const newBytes = this.randomBytesStrategy.getRandomBytes(this.poolSize);
    this.buffer.set(newBytes);
    this.position = 0;
  }
}

// Simple implementation that just calls randomBytes directly
class DirectByteProvider implements ByteProvider {
  constructor(private readonly randomBytesStrategy: RandomBytesStrategy = new DefaultRandomBytesStrategy()) {}

  getBytes(count: number): Uint8Array {
    return this.randomBytesStrategy.getRandomBytes(count);
  }
}

const charsetCache = new Map<string, number>();

const getMaxValidValue = (charset: string): number => {
  if (!charsetCache.has(charset)) {
    charsetCache.set(charset, Math.floor(256 / charset.length) * charset.length - 1);
  }
  return charsetCache.get(charset)!;
};

// Base62 charset: digits + lowercase + uppercase letters
export const BASE62_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// For XMPP JIDs
export const BASE36_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyz';

// Reusable string buffer - no allocations in hot path
let stringBuffer = '';

const uniqidImpl = (
  // For base 36, this is 124 bits of entropy
  length: number = 24,
  // Base36: digits + lowercase letters; this avoids case-sensitivity issues with XMPP JIDs
  charset = BASE36_CHARSET,
  byteProvider: ByteProvider = new DirectByteProvider()
): string => {
  if (length <= 0) {
    throw new Error('Length must be a positive integer');
  }

  const charsetLength = charset.length;

  if (charsetLength === 0) {
    throw new Error('Charset cannot be empty');
  }

  // Reset reusable buffer - no allocation
  stringBuffer = '';

  // Cache frequently accessed values to avoid repeated lookups
  const maxValidValue = getMaxValidValue(charset);
  let currentLength = 0; // Maintain our own length counter to avoid property lookups

  while (currentLength < length) {
    const needed = length - currentLength;
    // Request exactly what we need + small buffer to reduce iterations
    const requestSize = Math.max(needed, needed + 8);
    const bytes = byteProvider.getBytes(requestSize);
    const bytesLength = bytes.length;

    // Ensure we got some bytes to avoid infinite loop
    if (bytesLength === 0) {
      throw new Error('ByteProvider returned no bytes');
    }

    // Unroll the loop for better performance on small batches
    for (let i = 0; i < bytesLength && currentLength < length; i++) {
      const byte = bytes[i];
      if (byte <= maxValidValue) {
        // Direct character access - V8 optimizes this beautifully!
        stringBuffer += charset[byte % charsetLength];
        currentLength++; // Increment our own counter - faster than .length lookup
      }
    }
  }

  return stringBuffer;
};

/**
 * Creates a pooled version of uniqid for high-performance scenarios
 * where many IDs are generated in succession
 */
export const createPooledUniqid = (
  poolSize = 32_768, // 32KB default - benchmarks show this performs ~11% better than 8KB
  randomBytesStrategy?: RandomBytesStrategy
) => {
  const pool = new BytePool(poolSize, randomBytesStrategy);
  return (length = 24, charset?: string) => uniqidImpl(length, charset, pool);
};

/**
 * Generates a cryptographically secure random base62 string of a specified length
 * Highly efficient for generating many IDs in succession because of the way it uses a byte pool,
 * reducing the frequency of system calls to generate random bytes.
 */
export const uniqid = createPooledUniqid();

// Export types for external use
export type { ByteProvider, RandomBytesStrategy };

// Export classes for testing
export { BytePool, DirectByteProvider, DefaultRandomBytesStrategy };
