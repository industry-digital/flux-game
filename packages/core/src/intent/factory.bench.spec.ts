import { describe, it, expect } from 'vitest';
import { createIntent } from './factory';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_COMBAT_SESSION } from '~/testing/constants';

describe('Intent Factory Benchmarks', () => {

  // Test cases representing different complexity levels
  const testCases = [
    {
      name: 'Simple command',
      text: 'attack bob',
      description: 'Basic verb + single argument'
    },
    {
      name: 'Credit command (target)',
      text: '@credit flux:actor:alice gold 100 --memo="Gift from the queen"',
      description: 'Complex command with URN, quoted options, and multiple tokens'
    },
    {
      name: 'Complex combat command',
      text: 'advance distance 15 --stealth --weapon=sword --debug=true',
      description: 'Multiple options with mixed types'
    },
    {
      name: 'Long quoted string',
      text: 'say --message="This is a very long message with many words that tests the tokenizer performance with quoted strings containing spaces"',
      description: 'Long quoted content to test tokenization overhead'
    },
    {
      name: 'Many short tokens',
      text: 'craft sword from iron ore wood leather --enchanted --sharp --durable --lightweight',
      description: 'Many small tokens to test filtering performance'
    }
  ];

  describe('Throughput Benchmarks', () => {
    testCases.forEach(({ name, text, description }) => {
      it(`should process "${name}" efficiently`, () => {
        const iterations = 100000;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          createIntent({
            id: `bench${i}`,
            actor: ALICE_ID,
            location: DEFAULT_LOCATION,
            session: DEFAULT_COMBAT_SESSION,
            text,
          });
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        const throughput = iterations / (duration / 1000);
        const avgTime = duration / iterations;

        console.log(`\n📊 ${name.toUpperCase()} BENCHMARK`);
        console.log(`Description: ${description}`);
        console.log(`Input: "${text}"`);
        console.log(`Iterations: ${iterations.toLocaleString()}`);
        console.log(`Total time: ${duration.toFixed(2)}ms`);
        console.log(`Throughput: ${throughput.toLocaleString()} intents/sec`);
        console.log(`Average time per intent: ${(avgTime * 1000).toFixed(3)}μs`);

        // Verify the parsing still works correctly
        const testIntent = createIntent({
          id: 'verification',
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text,
        });

        expect(testIntent.text).toBe(text);
        expect(testIntent.normalized).toBe(text.toLowerCase().trim());
        expect(testIntent.verb).toBeTruthy();

        // Performance expectations (these may need adjustment based on hardware)
        expect(throughput).toBeGreaterThan(10000); // At least 10k intents/sec
        expect(avgTime).toBeLessThan(1); // Less than 1ms per intent
      });
    });
  });

  describe('Memory Efficiency', () => {
    it('should demonstrate memory usage patterns', () => {
      const text = '@credit flux:actor:alice gold 100 --memo="Gift from the queen"';
      const iterations = 10000;

      // Measure memory before
      if (global.gc) global.gc();
      const memBefore = process.memoryUsage();

      const intents = [];
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const intent = createIntent({
          id: `memtest${i}`,
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text,
        });
        intents.push(intent);
      }

      const endTime = performance.now();

      // Measure memory after
      if (global.gc) global.gc();
      const memAfter = process.memoryUsage();

      const duration = endTime - startTime;
      const memoryUsed = memAfter.heapUsed - memBefore.heapUsed;
      const bytesPerIntent = memoryUsed / iterations;

      console.log(`\n🧠 MEMORY EFFICIENCY ANALYSIS`);
      console.log(`Iterations: ${iterations.toLocaleString()}`);
      console.log(`Total memory used: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory per intent: ${bytesPerIntent.toFixed(0)} bytes`);
      console.log(`Processing time: ${duration.toFixed(2)}ms`);
      console.log(`Throughput: ${(iterations / (duration / 1000)).toLocaleString()} intents/sec`);

      // Verify intents are properly formed
      expect(intents).toHaveLength(iterations);
      expect(intents[0].verb).toBe('@credit');
      expect(intents[0].tokens).toEqual(['flux:actor:alice', 'gold', '100']);
      // @ts-expect-error - we are testing the options type
      expect(intents[0].options?.memo).toBe('Gift from the queen');

      // Memory usage should be reasonable (adjust based on expectations)
      expect(bytesPerIntent).toBeLessThan(1500); // Less than 1.5KB per intent (includes memoization overhead)
    });
  });

  describe('Tokenization Performance', () => {
    it('should compare tokenization strategies', () => {
      const testCases = [
        {
          name: 'No quotes',
          text: 'advance distance 15 stealth mode',
        },
        {
          name: 'Simple quotes',
          text: 'say --message="hello world"',
        },
        {
          name: 'Complex quotes',
          text: '@credit flux:actor:alice gold 100 --memo="Gift from the queen"',
        },
        {
          name: 'Multiple quotes',
          text: 'craft --name="Magic Sword" --description="A powerful blade" --material="steel"',
        },
        {
          name: 'Mixed quotes',
          text: 'command --single=\'value\' --double="another value" --unquoted=simple',
        }
      ];

      console.log(`\n⚡ TOKENIZATION PERFORMANCE COMPARISON`);
      console.log(`${'Case'.padEnd(20)} | ${'Tokens'.padEnd(8)} | ${'Time (μs)'.padEnd(12)} | ${'Rate (ops/sec)'.padEnd(15)}`);
      console.log('─'.repeat(65));

      testCases.forEach(({ name, text }) => {
        const iterations = 50000;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          createIntent({
            id: `tok${i}`,
            actor: ALICE_ID,
            location: DEFAULT_LOCATION,
            text,
          });
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        const avgTime = (duration / iterations) * 1000; // Convert to microseconds
        const throughput = iterations / (duration / 1000);

        // Get token count for reference
        const testIntent = createIntent({
          id: 'test',
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text,
        });

        console.log(`${name.padEnd(20)} | ${testIntent.tokens.length.toString().padEnd(8)} | ${avgTime.toFixed(3).padEnd(12)} | ${throughput.toLocaleString().padEnd(15)}`);

        expect(throughput).toBeGreaterThan(5000); // Minimum acceptable performance
      });
    });
  });

  describe('Command Variation Performance', () => {
    it('should handle varied commands efficiently', () => {
      console.log(`\n🎯 COMMAND VARIATION PERFORMANCE ANALYSIS`);

      // Test realistic game command variations
      const commandVariations = [
        // Credit commands with different actors/amounts
        '@credit flux:actor:alice gold 100 --memo="Gift from the queen"',
        '@credit flux:actor:bob silver 50 --memo="Payment"',
        '@credit flux:actor:charlie gold 200 --memo="Reward"',

        // Advance commands with different parameters
        'advance distance 10',
        'advance distance 20',
        'advance ap 2.5',
        'advance 15',

        // Attack commands with different targets
        'attack goblin',
        'attack orc',
        'attack dragon --weapon=sword',
      ];

      const iterations = 10000;

      console.log(`Testing ${commandVariations.length} command variations, ${iterations} iterations each`);

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const text of commandVariations) {
          createIntent({
            id: `variationtest${i}`,
            actor: ALICE_ID,
            location: DEFAULT_LOCATION,
            text,
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const totalOperations = iterations * commandVariations.length;
      const throughput = totalOperations / (duration / 1000);

      console.log(`\nClean implementation results:`);
      console.log(`Total operations: ${totalOperations.toLocaleString()}`);
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      console.log(`Throughput: ${throughput.toLocaleString()} ops/sec`);
      console.log(`Average time per operation: ${(duration / totalOperations * 1000).toFixed(3)}μs`);

      // Verify correctness
      const testResults = commandVariations.map(text => {
        const intent = createIntent({
          id: 'verification',
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text,
        });
        return { text, verb: intent.verb, tokens: intent.tokens.length };
      });

      console.log(`\nParsing verification:`);
      testResults.forEach(({ text, verb, tokens }) => {
        console.log(`  "${text.substring(0, 25)}..." → verb: "${verb}", tokens: ${tokens}`);
      });

      expect(throughput).toBeGreaterThan(100000); // Should still be fast without caching
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency parsing', () => {
      const text = '@credit flux:actor:alice gold 100 --memo="Gift from the queen"';
      const iterations = 1000000; // 1 million iterations

      console.log(`\n🔥 HIGH-FREQUENCY STRESS TEST`);
      console.log(`Target: ${iterations.toLocaleString()} iterations`);
      console.log(`Input: "${text}"`);

      const startTime = performance.now();
      let successCount = 0;

      for (let i = 0; i < iterations; i++) {
        try {
          const intent = createIntent({
            id: `stress${i}`,
            actor: ALICE_ID,
            location: DEFAULT_LOCATION,
            text,
          });

          // Quick validation
          if (intent.verb === '@credit' && intent.tokens.length === 3) {
            successCount++;
          }
        } catch (error) {
          console.error(`Error at iteration ${i}:`, error);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const throughput = successCount / (duration / 1000);
      const avgTime = duration / successCount;

      console.log(`Completed: ${successCount.toLocaleString()}/${iterations.toLocaleString()}`);
      console.log(`Success rate: ${((successCount / iterations) * 100).toFixed(2)}%`);
      console.log(`Total time: ${(duration / 1000).toFixed(2)}s`);
      console.log(`Throughput: ${throughput.toLocaleString()} intents/sec`);
      console.log(`Average time: ${(avgTime * 1000).toFixed(3)}μs per intent`);

      expect(successCount).toBe(iterations);
      expect(throughput).toBeGreaterThan(50000); // Should handle at least 50k/sec
    });
  });
});
