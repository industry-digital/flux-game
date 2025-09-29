import { describe, it, expect } from 'vitest';
import { hashUnsafeString } from './hash';

describe('hashUnsafeString benchmarks', () => {
  const generateTestData = (count: number) => {
    const data = [];
    // Realistic 8-character shell names (average length)
    const baseNames = [
      'combat01',   // 8 chars
      'stealth2',   // 8 chars
      'heavy mk',   // 8 chars
      'recon v2',   // 8 chars
      'mining a',   // 8 chars
      'explore1',   // 8 chars
      'support3',   // 8 chars
      'tank cfg',   // 8 chars
      'dps spec',   // 8 chars
      'healer x'    // 8 chars
    ];

    for (let i = 0; i < count; i++) {
      // Use base names with slight variations to maintain ~8 char average
      const baseName = baseNames[i % baseNames.length];
      const variant = i % 100;

      if (variant < 10) {
        data.push(baseName); // Exact 8 chars
      } else if (variant < 50) {
        data.push(baseName + (variant % 10)); // 9 chars
      } else if (variant < 80) {
        data.push(baseName.slice(0, 7) + (variant % 10)); // 8 chars
      } else {
        data.push(baseName.slice(0, 6) + (variant % 100)); // 8 chars
      }
    }
    return data;
  };

  it('should verify average shell name length is ~8 characters', () => {
    const testData = generateTestData(1000);
    const avgLength = testData.reduce((sum, name) => sum + name.length, 0) / testData.length;

    console.log(`\n📏 Shell Name Length Analysis:`);
    console.log(`  Sample size: ${testData.length.toLocaleString()}`);
    console.log(`  Average length: ${avgLength.toFixed(1)} characters`);
    console.log(`  Min length: ${Math.min(...testData.map(n => n.length))}`);
    console.log(`  Max length: ${Math.max(...testData.map(n => n.length))}`);

    expect(avgLength).toBeGreaterThan(7.5);
    expect(avgLength).toBeLessThan(8.5);
  });

  it('should benchmark 1,000 hashes (8-char names)', () => {
    const testData = generateTestData(1000);
    const avgLength = testData.reduce((sum, name) => sum + name.length, 0) / testData.length;

    const start = performance.now();
    const results = testData.map(input => hashUnsafeString(input));
    const end = performance.now();

    const duration = end - start;
    const throughput = (1000 / duration) * 1000; // hashes per second

    console.log(`\n📊 1K Benchmark Results (avg ${avgLength.toFixed(1)} chars):`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Throughput: ${Math.round(throughput).toLocaleString()} hashes/sec`);
    console.log(`  Avg per hash: ${(duration / 1000).toFixed(3)}ms`);

    expect(results.length).toBe(1000);
    expect(duration).toBeLessThan(100); // Should complete in < 100ms
    expect(throughput).toBeGreaterThan(10000); // Should handle > 10K hashes/sec
  });

  it('should benchmark 10,000 hashes (8-char names)', () => {
    const testData = generateTestData(10000);
    const avgLength = testData.reduce((sum, name) => sum + name.length, 0) / testData.length;

    const start = performance.now();
    const results = testData.map(input => hashUnsafeString(input));
    const end = performance.now();

    const duration = end - start;
    const throughput = (10000 / duration) * 1000; // hashes per second

    console.log(`\n📊 10K Benchmark Results (avg ${avgLength.toFixed(1)} chars):`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Throughput: ${Math.round(throughput).toLocaleString()} hashes/sec`);
    console.log(`  Avg per hash: ${(duration / 10000).toFixed(4)}ms`);

    expect(results.length).toBe(10000);
    expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    expect(throughput).toBeGreaterThan(10000); // Should handle > 10K hashes/sec
  });

  it('should benchmark 100,000 hashes (8-char names)', () => {
    const testData = generateTestData(100000);
    const avgLength = testData.reduce((sum, name) => sum + name.length, 0) / testData.length;

    const start = performance.now();
    const results = testData.map(input => hashUnsafeString(input));
    const end = performance.now();

    const duration = end - start;
    const throughput = (100000 / duration) * 1000; // hashes per second

    console.log(`\n📊 100K Benchmark Results (avg ${avgLength.toFixed(1)} chars):`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Throughput: ${Math.round(throughput).toLocaleString()} hashes/sec`);
    console.log(`  Avg per hash: ${(duration / 100000).toFixed(5)}ms`);

    expect(results.length).toBe(100000);
    expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds
    expect(throughput).toBeGreaterThan(10000); // Should handle > 10K hashes/sec
  });

  it('should benchmark worst-case inputs (long strings with many special chars)', () => {
    const worstCaseInputs = Array.from({ length: 1000 }, (_, i) =>
      `!@#$%^&*()_+{}|:"<>?[]\\;',./${'a'.repeat(40)}${i}!@#$%^&*()`
    );

    const start = performance.now();
    const results = worstCaseInputs.map(input => hashUnsafeString(input));
    const end = performance.now();

    const duration = end - start;
    const throughput = (1000 / duration) * 1000; // hashes per second

    console.log(`\n📊 Worst-Case Benchmark Results:`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Throughput: ${Math.round(throughput).toLocaleString()} hashes/sec`);
    console.log(`  Avg per hash: ${(duration / 1000).toFixed(3)}ms`);

    expect(results.length).toBe(1000);
    expect(duration).toBeLessThan(200); // Should handle worst case reasonably
    expect(throughput).toBeGreaterThan(5000); // Should still be fast
  });

  it('should benchmark memory efficiency (no memory leaks)', () => {
    const testData = generateTestData(10000);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;

    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      testData.forEach(input => hashUnsafeString(input));
    }
    const end = performance.now();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDelta = finalMemory - initialMemory;
    const duration = end - start;
    const totalHashes = 50000;
    const throughput = (totalHashes / duration) * 1000;

    console.log(`\n📊 Memory Efficiency Benchmark:`);
    console.log(`  Total hashes: ${totalHashes.toLocaleString()}`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Throughput: ${Math.round(throughput).toLocaleString()} hashes/sec`);
    console.log(`  Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Memory per hash: ${(memoryDelta / totalHashes).toFixed(2)} bytes`);

    expect(totalHashes).toBe(50000);
    // Memory usage should be reasonable (< 10MB for 50K hashes)
    expect(memoryDelta).toBeLessThan(10 * 1024 * 1024);
  });

  it('should compare performance against naive implementations (8-char names)', () => {
    const testData = generateTestData(1000);
    const avgLength = testData.reduce((sum, name) => sum + name.length, 0) / testData.length;

    // Naive implementation 1: JSON.stringify + btoa
    const naiveHash1 = (input: string) => {
      try {
        return btoa(JSON.stringify(input)).replace(/[^a-z0-9]/gi, '').toLowerCase();
      } catch {
        return 'fallback';
      }
    };

    // Naive implementation 2: Simple character code sum
    const naiveHash2 = (input: string) => {
      let sum = 0;
      for (let i = 0; i < input.length; i++) {
        sum += input.charCodeAt(i);
      }
      return sum.toString(36);
    };

    // Benchmark our implementation
    const start1 = performance.now();
    testData.forEach(input => hashUnsafeString(input));
    const end1 = performance.now();
    const ourDuration = end1 - start1;

    // Benchmark naive implementation 1
    const start2 = performance.now();
    testData.forEach(input => naiveHash1(input));
    const end2 = performance.now();
    const naive1Duration = end2 - start2;

    // Benchmark naive implementation 2
    const start3 = performance.now();
    testData.forEach(input => naiveHash2(input));
    const end3 = performance.now();
    const naive2Duration = end3 - start3;

    console.log(`\n📊 Performance Comparison (avg ${avgLength.toFixed(1)} chars):`);
    console.log(`  Our implementation: ${ourDuration.toFixed(2)}ms`);
    console.log(`  Naive (JSON+btoa): ${naive1Duration.toFixed(2)}ms (${(naive1Duration/ourDuration).toFixed(1)}x slower)`);
    console.log(`  Naive (char sum): ${naive2Duration.toFixed(2)}ms (${(naive2Duration/ourDuration).toFixed(1)}x slower)`);

    // Our implementation should be competitive
    expect(ourDuration).toBeLessThan(naive1Duration * 2); // At most 2x slower than naive
  });
});
