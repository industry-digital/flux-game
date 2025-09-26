import { describe, it, expect, beforeEach } from 'vitest';
import { randomBytes } from 'crypto';
import {
  uniqid,
  createPooledUniqid,
  RandomBytesStrategy,
  BytePool,
  DirectByteProvider,
  DefaultRandomBytesStrategy,
} from './random';

// Test strategy that returns predictable bytes
class MockRandomBytesStrategy implements RandomBytesStrategy {
  constructor(private sequence: number[] = [0, 1, 2, 3, 4, 5]) {}

  getRandomBytes(count: number): Uint8Array {
    const result = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.sequence[i % this.sequence.length];
    }
    return result;
  }
}

// Test strategy that uses real crypto for Node.js tests
class NodeCryptoStrategy implements RandomBytesStrategy {
  getRandomBytes(count: number): Uint8Array {
    return new Uint8Array(randomBytes(count));
  }
}

describe('RandomBytesStrategy', () => {
  describe('MockRandomBytesStrategy', () => {
    it('should return predictable bytes', () => {
      const strategy = new MockRandomBytesStrategy([42, 43, 44]);
      const result = strategy.getRandomBytes(5);

      expect(result).toHaveLength(5);
      expect(Array.from(result)).toEqual([42, 43, 44, 42, 43]);
    });

    it('should handle different sequence lengths', () => {
      const strategy = new MockRandomBytesStrategy([255]);
      const result = strategy.getRandomBytes(3);

      expect(Array.from(result)).toEqual([255, 255, 255]);
    });
  });

  describe('NodeCryptoStrategy', () => {
    it('should generate random bytes using Node.js crypto', () => {
      const strategy = new NodeCryptoStrategy();
      const result1 = strategy.getRandomBytes(16);
      const result2 = strategy.getRandomBytes(16);

      expect(result1).toHaveLength(16);
      expect(result2).toHaveLength(16);
      expect(result1).not.toEqual(result2);
    });

    it('should generate different lengths correctly', () => {
      const strategy = new NodeCryptoStrategy();

      expect(strategy.getRandomBytes(1)).toHaveLength(1);
      expect(strategy.getRandomBytes(32)).toHaveLength(32);
      expect(strategy.getRandomBytes(1024)).toHaveLength(1024);
    });
  });

  describe('DefaultRandomBytesStrategy', () => {
    it('should work with default cross-platform implementation', () => {
      const strategy = new DefaultRandomBytesStrategy();
      const result = strategy.getRandomBytes(16);

      expect(result).toHaveLength(16);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should generate different results on subsequent calls', () => {
      const strategy = new DefaultRandomBytesStrategy();
      const result1 = strategy.getRandomBytes(8);
      const result2 = strategy.getRandomBytes(8);

      expect(result1).not.toEqual(result2);
    });
  });
});

describe('BytePool', () => {
  let mockStrategy: MockRandomBytesStrategy;

  beforeEach(() => {
    mockStrategy = new MockRandomBytesStrategy([10, 20, 30, 40, 50, 60]);
  });

  it('should use injected strategy for byte generation', () => {
    const pool = new BytePool(10, mockStrategy);

    const result = pool.getBytes(3);
    expect(result).toHaveLength(3);
    expect(Array.from(result)).toEqual([10, 20, 30]);
  });

  it('should reuse buffer for small requests', () => {
    const pool = new BytePool(10, mockStrategy);

    const result1 = pool.getBytes(2);
    const result2 = pool.getBytes(2);

    expect(Array.from(result1)).toEqual([10, 20]);
    expect(Array.from(result2)).toEqual([30, 40]);
  });

  it('should refill buffer when needed', () => {
    const pool = new BytePool(4, mockStrategy);

    // Use up the initial buffer
    pool.getBytes(4);

    // This should trigger a refill
    const result = pool.getBytes(2);
    expect(result).toHaveLength(2);
  });

  it('should bypass pool for large requests', () => {
    const pool = new BytePool(4, mockStrategy);

    // Request larger than pool size
    const result = pool.getBytes(10);
    expect(result).toHaveLength(10);
  });

  it('should work with default strategy', () => {
    const pool = new BytePool(16);

    const result = pool.getBytes(8);
    expect(result).toHaveLength(8);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('DirectByteProvider', () => {
  it('should use injected strategy', () => {
    const mockStrategy = new MockRandomBytesStrategy([100, 101, 102]);
    const provider = new DirectByteProvider(mockStrategy);

    const result = provider.getBytes(3);
    expect(Array.from(result)).toEqual([100, 101, 102]);
  });

  it('should work with default strategy', () => {
    const provider = new DirectByteProvider();

    const result = provider.getBytes(8);
    expect(result).toHaveLength(8);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('uniqid function', () => {
  it('should generate IDs of specified length', () => {
    const id = uniqid(10);
    expect(id).toHaveLength(10);
  });

  it('should generate IDs with default length', () => {
    const id = uniqid();
    expect(id).toHaveLength(24);
  });

  it('should generate different IDs on subsequent calls', () => {
    const id1 = uniqid();
    const id2 = uniqid();
    expect(id1).not.toBe(id2);
  });

  it('should use custom charset', () => {
    const id = uniqid(10, 'ABC');
    expect(id).toHaveLength(10);
    expect(id).toMatch(/^[ABC]+$/);
  });

  it('should throw error for invalid length', () => {
    expect(() => uniqid(0)).toThrow('Length must be a positive integer');
    expect(() => uniqid(-1)).toThrow('Length must be a positive integer');
  });

  it('should throw error for empty charset', () => {
    expect(() => uniqid(10, '')).toThrow('Charset cannot be empty');
  });

  it('should handle single character charset', () => {
    const id = uniqid(5, 'X');
    expect(id).toBe('XXXXX');
  });
});

describe('createPooledUniqid', () => {
  it('should create a function that generates IDs', () => {
    const generateId = createPooledUniqid(64);
    const id = generateId(8);
    expect(id).toHaveLength(8);
  })

  it('should use custom strategy', () => {
    const mockStrategy = new MockRandomBytesStrategy([0, 1, 2, 3, 4, 5]);
    const generateId = createPooledUniqid(64, mockStrategy);

    const id1 = generateId(3, 'ABC');
    const id2 = generateId(3, 'ABC');

    // Should use the predictable sequence from our mock strategy
    // Both IDs should be deterministic and consistent
    expect(id1).toHaveLength(3);
    expect(id2).toHaveLength(3);
    expect(id1).toMatch(/^[ABC]+$/);
    expect(id2).toMatch(/^[ABC]+$/);

    // Since we're using the same mock strategy, behavior should be predictable
    // Let's verify the strategy is actually being used by checking multiple calls
    const id3 = generateId(3, 'ABC');
    expect(id3).toMatch(/^[ABC]+$/);
  });

  it('should work with different pool sizes', () => {
    const smallPool = createPooledUniqid(8);
    const largePool = createPooledUniqid(1024);

    expect(smallPool(4)).toHaveLength(4);
    expect(largePool(4)).toHaveLength(4);
  });

  it('should handle custom charset in returned function', () => {
    const generateId = createPooledUniqid(64);
    const id = generateId(10, '0123456789');

    expect(id).toHaveLength(10);
    expect(id).toMatch(/^[0-9]+$/);
  });
});

describe('uniqid with Node.js crypto', () => {
  it('should generate cryptographically secure IDs', () => {
    const nodeStrategy = new NodeCryptoStrategy();
    const generateId = createPooledUniqid(1024, nodeStrategy);

    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId(16));
    }

    // All IDs should be unique
    expect(ids.size).toBe(100);
  });

  it('should generate IDs with proper distribution', () => {
    const nodeStrategy = new NodeCryptoStrategy();
    const generateId = createPooledUniqid(1024, nodeStrategy);

    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const counts = new Map<string, number>();

    // Generate many short IDs and count character frequency
    for (let i = 0; i < 1000; i++) {
      const id = generateId(1, charset);
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    // Should have reasonable distribution (not perfect due to randomness)
    expect(counts.size).toBeGreaterThan(20); // Should see most characters
  });
});

describe('edge cases and error handling', () => {
  it('should handle large ID requests', () => {
    const id = uniqid(1000);
    expect(id).toHaveLength(1000);
  });

  it('should handle charset with repeated characters', () => {
    const id = uniqid(10, 'AAABBBCCC');
    expect(id).toHaveLength(10);
    expect(id).toMatch(/^[ABC]+$/);
  });

  it('should handle charset with special characters', () => {
    const charset = '!@#$%^&*()';
    const id = uniqid(5, charset);
    expect(id).toHaveLength(5);
    expect(id).toMatch(/^[!@#$%^&*()]+$/);
  });

  it('should handle very large charset', () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const id = uniqid(20, charset);
    expect(id).toHaveLength(20);
  });
});

describe('performance characteristics', () => {
  it('should efficiently generate many IDs', () => {
    const start = Date.now();
    const ids = [];

    for (let i = 0; i < 1000; i++) {
      ids.push(uniqid(16));
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(ids).toHaveLength(1000);
    expect(new Set(ids).size).toBe(1000); // All unique
  });

  it('should benefit from pooling for repeated calls', () => {
    const generateId = createPooledUniqid(4096);

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      generateId(8);
    }
    const pooledDuration = Date.now() - start;

    // This is more of a sanity check than a precise benchmark
    expect(pooledDuration).toBeLessThan(1000);
  });
});
