// Cross-platform random bytes generation
const getRandomBytes = (count: number): Uint8Array => {
  // Browser environment - use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(count);
    window.crypto.getRandomValues(bytes);
    return bytes;
  }

  // Fallback for other environments (like Web Workers)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(count);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  // Node.js environment - use crypto module
  try {
    // Dynamic import for Node.js crypto module
    const cryptoModule = (globalThis as any)?.require?.('crypto');
    if (cryptoModule && cryptoModule.randomBytes) {
      return new Uint8Array(cryptoModule.randomBytes(count));
    }
  } catch (error) {
    // Fall through to error below
  }

  throw new Error('No secure random number generator available');
};

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
  private buffer: Uint8Array = new Uint8Array(0);
  private position = 0;

  constructor(
    private readonly poolSize = 1024,
    private readonly randomBytesStrategy: RandomBytesStrategy = new DefaultRandomBytesStrategy()
  ) {}

  getBytes(count: number): Uint8Array {
    // Handle requests larger than pool size
    if (count > this.poolSize) {
      return this.randomBytesStrategy.getRandomBytes(count);
    }

    if (this.position + count > this.buffer.length) {
      this.refill();
    }

    const result = this.buffer.slice(this.position, this.position + count);
    this.position += count;
    return result;
  }

  private refill(): void {
    this.buffer = this.randomBytesStrategy.getRandomBytes(this.poolSize);
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

const uniqidImpl = (
  // For base 36, this is 124 bits of entropy
  length: number = 24,
  // Base36: digits + lowercase letters; this avoids case-sensitivity issues with XMPP JIDs
  charset = 'abcdefghijklmnopqrstuvwxyz0123456789',
  byteProvider: ByteProvider = new DirectByteProvider()
): string => {
  if (length <= 0) {
    throw new Error('Length must be a positive integer');
  }

  if (charset.length === 0) {
    throw new Error('Charset cannot be empty');
  }

  const result: string[] = [];
  const maxValidValue = getMaxValidValue(charset);

  while (result.length < length) {
    const needed = length - result.length;
    const requestSize = Math.max(needed, Math.ceil(needed * 1.3));
    const bytes = byteProvider.getBytes(requestSize);

    // Ensure we got some bytes to avoid infinite loop
    if (bytes.length === 0) {
      throw new Error('ByteProvider returned no bytes');
    }

    for (const byte of bytes) {
      if (byte <= maxValidValue) {
        result.push(charset[byte % charset.length]);
        if (result.length === length) break;
      }
    }
  }

  return result.join('');
};

/**
 * Creates a pooled version of uniqid for high-performance scenarios
 * where many IDs are generated in succession
 */
export const createPooledUniqid = (
  poolSize = 4_096,
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
export const uniqid = createPooledUniqid(4096);

// Export types for external use
export type { ByteProvider, RandomBytesStrategy };

// Export classes for testing
export { BytePool, DirectByteProvider, DefaultRandomBytesStrategy };
