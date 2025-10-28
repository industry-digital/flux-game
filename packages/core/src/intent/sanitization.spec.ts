import { describe, it, expect } from 'vitest';
import { sanitize } from './sanitization';

describe('sanitize', () => {
  describe('valid inputs', () => {
    it('should preserve simple alphanumeric strings', () => {
      expect(sanitize('test')).toBe('test');
      expect(sanitize('Test123')).toBe('Test123');
      expect(sanitize('MyShell')).toBe('MyShell');
    });

    it('should preserve Latin1 extended characters', () => {
      expect(sanitize('café')).toBe('café');
      expect(sanitize('naïve')).toBe('naïve');
      expect(sanitize('résumé')).toBe('résumé');
      expect(sanitize('piñata')).toBe('piñata');
    });

    it('should normalize consecutive spaces to single spaces', () => {
      expect(sanitize('hello    world')).toBe('hello world');
      expect(sanitize('a  b   c    d')).toBe('a b c d');
      expect(sanitize('test     name')).toBe('test name');
    });

    it('should trim leading and trailing spaces', () => {
      expect(sanitize('  hello  ')).toBe('hello');
      expect(sanitize('   test')).toBe('test');
      expect(sanitize('world   ')).toBe('world');
      expect(sanitize('  a  b  ')).toBe('a b');
    });

    it('should handle mixed valid characters', () => {
      expect(sanitize('Shell_123-Test')).toBe('Shell123Test');
      expect(sanitize('My Cool Shell!')).toBe('My Cool Shell');
      expect(sanitize('test@domain.com')).toBe('testdomaincom');
    });

    it('should handle maximum length strings', () => {
      const maxString = 'a'.repeat(50);
      expect(sanitize(maxString)).toBe(maxString);

      const maxWithSpaces = 'a'.repeat(25) + ' ' + 'b'.repeat(24);
      expect(sanitize(maxWithSpaces)).toBe(maxWithSpaces);
    });
  });

  describe('invalid characters removal', () => {
    it('should remove special characters', () => {
      expect(sanitize('hello@world')).toBe('helloworld');
      expect(sanitize('test#$%^&*()')).toBe('test');
      expect(sanitize('shell<>?/\\|')).toBe('shell');
    });

    it('should remove quotes and brackets', () => {
      expect(sanitize('shell"name"')).toBe('shellname');
      expect(sanitize("shell'name'")).toBe('shellname');
      expect(sanitize('shell[name]')).toBe('shellname');
      expect(sanitize('shell{name}')).toBe('shellname');
    });

    it('should remove unicode characters outside Latin1', () => {
      expect(sanitize('test🚀emoji')).toBe('testemoji');
      expect(sanitize('shell中文name')).toBe('shellname');
      expect(sanitize('test™symbol')).toBe('testsymbol');
    });
  });

  describe('error cases', () => {
    it('should throw for non-string input', () => {
      expect(() => sanitize(null as any)).toThrow('Token must be a string');
      expect(() => sanitize(undefined as any)).toThrow('Token must be a string');
      expect(() => sanitize(123 as any)).toThrow('Token must be a string');
      expect(() => sanitize({} as any)).toThrow('Token must be a string');
    });

    it('should throw for empty strings', () => {
      expect(() => sanitize('')).toThrow('Token must contain at least one valid character');
    });

    it('should throw for strings with no valid characters', () => {
      expect(() => sanitize('!@#$%^&*()')).toThrow('Token must contain at least one valid character');
      expect(() => sanitize('   ')).toThrow('Token must contain at least one valid character');
      expect(() => sanitize('🚀🎮🎯')).toThrow('Token must contain at least one valid character');
    });

    it('should throw for strings exceeding length limit', () => {
      const tooLong = 'a'.repeat(51);
      expect(() => sanitize(tooLong)).toThrow('Token is too long (max 50 characters)');

      const tooLongWithSpaces = 'a'.repeat(26) + ' ' + 'b'.repeat(25);
      expect(() => sanitize(tooLongWithSpaces)).toThrow('Token is too long (max 50 characters)');
    });

    it('should throw early when length limit exceeded during processing', () => {
      // Mix valid and invalid chars, but valid portion exceeds limit
      const mixed = 'a'.repeat(30) + '!@#$%' + 'b'.repeat(25);
      expect(() => sanitize(mixed)).toThrow('Token is too long (max 50 characters)');
    });
  });

  describe('edge cases', () => {
    it('should handle single character strings', () => {
      expect(sanitize('a')).toBe('a');
      expect(sanitize('1')).toBe('1');
      expect(sanitize('é')).toBe('é');
    });

    it('should handle strings that become empty after invalid char removal', () => {
      expect(() => sanitize('!@#')).toThrow('Token must contain at least one valid character');
      expect(() => sanitize('   !@#   ')).toThrow('Token must contain at least one valid character');
    });

    it('should handle strings with only spaces', () => {
      expect(() => sanitize(' ')).toThrow('Token must contain at least one valid character');
      expect(() => sanitize('     ')).toThrow('Token must contain at least one valid character');
    });

    it('should handle mixed spaces and invalid characters', () => {
      expect(sanitize('a ! b')).toBe('a b');
      expect(sanitize('test @ name')).toBe('test name');
      expect(sanitize('  hello ! world  ')).toBe('hello world');
    });
  });

  describe('performance benchmarks', () => {
    const createBenchmark = (name: string, input: string, iterations: number = 1000) => {
      it(`benchmark: ${name}`, () => {
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
          sanitize(input);
        }

        const end = performance.now();
        const totalTime = end - start;
        const avgTime = totalTime / iterations;

        console.log(`${name}: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(4)}ms avg (${iterations} iterations)`);

        // Sanity check - should complete reasonably fast
        expect(totalTime).toBeLessThan(100); // 100ms for 1000 iterations
      });
    };

    createBenchmark('short clean string', 'MyShell');
    createBenchmark('medium string with spaces', 'My Cool Shell Name');
    createBenchmark('string with many invalid chars', 'test!@#$%^&*()name');
    createBenchmark('string with Latin1 chars', 'café résumé naïve');
    createBenchmark('max length string', 'a'.repeat(50));
    createBenchmark('string that needs space normalization', 'hello    world    test');

    // Stress test with higher iteration count
    createBenchmark('stress test - short string', 'test', 10000);
  });

  describe('character code validation', () => {
    it('should accept all valid character ranges', () => {
      // Test boundary conditions for each range
      expect(sanitize('0')).toBe('0'); // 48
      expect(sanitize('9')).toBe('9'); // 57
      expect(sanitize('A')).toBe('A'); // 65
      expect(sanitize('Z')).toBe('Z'); // 90
      expect(sanitize('a')).toBe('a'); // 97
      expect(sanitize('z')).toBe('z'); // 122
      expect(sanitize('a ')).toBe('a'); // 32 (space, test with other char)
      expect(sanitize('À')).toBe('À'); // 192
      expect(sanitize('ÿ')).toBe('ÿ'); // 255
    });

    it('should reject characters outside valid ranges', () => {
      // Just outside each range - these should throw since they result in empty strings
      expect(() => sanitize('/')).toThrow(); // 47 (just before 0-9)
      expect(() => sanitize(':')).toThrow(); // 58 (just after 0-9)
      expect(() => sanitize('@')).toThrow(); // 64 (just before A-Z)
      expect(() => sanitize('[')).toThrow(); // 91 (just after A-Z)
      expect(() => sanitize('`')).toThrow(); // 96 (just before a-z)
      expect(() => sanitize('{')).toThrow(); // 123 (just after a-z)
      expect(() => sanitize('¿')).toThrow(); // 191 (just before Latin1 extended, not in our range)
    });
  });
});
