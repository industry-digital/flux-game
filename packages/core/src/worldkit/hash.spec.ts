import { describe, it, expect } from 'vitest';
import { hashUnsafeString } from './hash';

describe('hashUnsafeString', () => {
  describe('basic functionality', () => {
    it('should hash simple alphanumeric strings', () => {
      const result = hashUnsafeString('combat');
      expect(result).toMatch(/^[a-z0-9]+$/);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be deterministic - same input produces same output', () => {
      const input = 'test shell';
      const hash1 = hashUnsafeString(input);
      const hash2 = hashUnsafeString(input);
      expect(hash1).toBe(hash2);
    });

    it('should handle mixed case by normalizing to lowercase', () => {
      const lower = hashUnsafeString('combat');
      const upper = hashUnsafeString('COMBAT');
      const mixed = hashUnsafeString('CoMbAt');
      expect(lower).toBe(upper);
      expect(lower).toBe(mixed);
    });

    it('should preserve spaces in shell names', () => {
      const withSpaces = hashUnsafeString('combat shell');
      const withoutSpaces = hashUnsafeString('combatshell');
      expect(withSpaces).not.toBe(withoutSpaces);
    });

    it('should handle numbers in input strings', () => {
      const result = hashUnsafeString('shell123');
      expect(result).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('security filtering', () => {
    it('should strip dangerous prototype pollution attempts', () => {
      const result = hashUnsafeString('__proto__');
      expect(result).toMatch(/^[a-z0-9]+$/);
      // Should only contain 'proto' after filtering
      const protoOnly = hashUnsafeString('proto');
      expect(result).toBe(protoOnly);
    });

    it('should strip constructor attempts', () => {
      const result = hashUnsafeString('constructor');
      expect(result).toMatch(/^[a-z0-9]+$/);
    });

    it('should remove special characters and symbols', () => {
      const input = 'combat!@#$%^&*()shell';
      const expected = hashUnsafeString('combatshell');
      const actual = hashUnsafeString(input);
      expect(actual).toBe(expected);
    });

    it('should remove path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const expected = hashUnsafeString('etcpasswd');
      const actual = hashUnsafeString(input);
      expect(actual).toBe(expected);
    });

    it('should handle unicode and emoji by filtering them out', () => {
      const input = 'combat🚀shell™';
      const expected = hashUnsafeString('combatshell');
      const actual = hashUnsafeString(input);
      expect(actual).toBe(expected);
    });

    it('should handle SQL injection attempts', () => {
      const input = "'; DROP TABLE shells; --";
      const result = hashUnsafeString(input);
      expect(result).toMatch(/^[a-z0-9]+$/);
      expect(result.length).toBeGreaterThan(0);
      // Should strip out dangerous characters and produce a safe hash
      expect(result).not.toContain("'");
      expect(result).not.toContain(";");
      expect(result).not.toContain("-");
    });
  });

  describe('validation and error handling', () => {
    it('should throw error for empty strings', () => {
      expect(() => hashUnsafeString('')).toThrow('String must contain at least one alphanumeric character');
    });

    it('should accept whitespace-only strings', () => {
      const result = hashUnsafeString('   ');
      expect(result).toMatch(/^[a-z0-9]+$/);
    });

    it('should throw error for strings with only special characters', () => {
      expect(() => hashUnsafeString('!@#$%^&*()')).toThrow('String must contain at least one alphanumeric character');
    });

    it('should throw error for strings that are too long', () => {
      const longString = 'a'.repeat(51);
      expect(() => hashUnsafeString(longString)).toThrow('String is too long (max 50 alphanumeric characters)');
    });

    it('should accept strings at the 50 character limit', () => {
      const fiftyChars = 'a'.repeat(50);
      const result = hashUnsafeString(fiftyChars);
      expect(result).toMatch(/^[a-z0-9]+$/);
    });

    it('should count only alphanumeric characters toward length limit', () => {
      // 50 'a's + 50 special chars = 100 total, but only 50 alphanumeric
      const input = 'a'.repeat(50) + '!'.repeat(50);
      const result = hashUnsafeString(input);
      expect(result).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('hash collision resistance', () => {
    it('should produce different hashes for different inputs', () => {
      const inputs = [
        'combat',
        'stealth',
        'mining',
        'exploration',
        'heavy assault',
        'light recon',
        'support',
        'tank',
        'dps',
        'healer'
      ];

      const hashes = inputs.map(input => hashUnsafeString(input));
      const uniqueHashes = new Set(hashes);

      expect(uniqueHashes.size).toBe(hashes.length);
    });

    it('should handle similar strings without collision', () => {
      const similar = [
        'combat1',
        'combat2',
        'combat3',
        'combata',
        'combatb',
        'combatc'
      ];

      const hashes = similar.map(input => hashUnsafeString(input));
      const uniqueHashes = new Set(hashes);

      expect(uniqueHashes.size).toBe(hashes.length);
    });
  });

  describe('hash format consistency', () => {
    it('should produce valid hash strings', () => {
      const testCases = [
        'combat',
        'stealth mode',
        'heavy123',
        'a',
        'z'.repeat(50)
      ];

      testCases.forEach(input => {
        const result = hashUnsafeString(input);
        expect(result).toMatch(/^[a-z0-9]+$/);
      });
    });

    it('should only contain safe characters in hash', () => {
      const testCases = [
        'combat',
        'special chars !@#$',
        'unicode 🚀',
        'mixed Case 123'
      ];

      testCases.forEach(input => {
        const result = hashUnsafeString(input);
        expect(result).toMatch(/^[a-z0-9]+$/);
      });
    });

    it('should produce reasonable hash lengths', () => {
      const testCases = [
        'a',
        'combat',
        'very long shell name with spaces',
        'z'.repeat(50)
      ];

      testCases.forEach(input => {
        const result = hashUnsafeString(input);
        // Hash should be reasonable length (not too short, not too long)
        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThan(20); // Reasonable upper bound
      });
    });
  });

  describe('edge cases', () => {
    it('should handle single character inputs', () => {
      const result = hashUnsafeString('a');
      expect(result).toMatch(/^[a-z0-9]+$/);
    });

    it('should handle numeric-only inputs', () => {
      const result = hashUnsafeString('123');
      expect(result).toMatch(/^[a-z0-9]+$/);
    });

    it('should handle mixed alphanumeric with spaces', () => {
      const result = hashUnsafeString('shell 123 abc');
      expect(result).toMatch(/^[a-z0-9]+$/);
    });

    it('should be consistent with leading/trailing special characters', () => {
      const clean = hashUnsafeString('combat');
      const withSpecial = hashUnsafeString('!!!combat!!!');
      expect(clean).toBe(withSpecial);
    });
  });

  describe('input/output examples', () => {
    it('should show actual hash outputs for common inputs', () => {
      const examples = [
        // Typical 8-character shell names
        { input: 'combat01', expected: /^[a-z0-9]+$/ },
        { input: 'stealth2', expected: /^[a-z0-9]+$/ },
        { input: 'heavy mk', expected: /^[a-z0-9]+$/ },
        { input: 'recon v2', expected: /^[a-z0-9]+$/ },
        { input: 'mining a', expected: /^[a-z0-9]+$/ },

        // Edge cases
        { input: 'a', expected: /^[a-z0-9]+$/ },
        { input: '123', expected: /^[a-z0-9]+$/ },
        { input: 'Combat Shell', expected: /^[a-z0-9]+$/ },
        { input: 'HEAVY ASSAULT', expected: /^[a-z0-9]+$/ },

        // Security test cases
        { input: '__proto__', expected: /^[a-z0-9]+$/ },
        { input: 'constructor', expected: /^[a-z0-9]+$/ },
        { input: 'shell!@#$%name', expected: /^[a-z0-9]+$/ },
        { input: '../../../etc', expected: /^[a-z0-9]+$/ },
        { input: 'combat🚀shell', expected: /^[a-z0-9]+$/ },
        { input: '   spaced   ', expected: /^[a-z0-9]+$/ }
      ];

      console.log('\n🔍 hashUnsafeString Input/Output Examples:');
      console.log('─'.repeat(50));

      examples.forEach(({ input, expected }) => {
        const output = hashUnsafeString(input);
        const inputDisplay = `"${input}"`.padEnd(20);
        const outputDisplay = `"${output}"`.padEnd(12);
        const lengths = `(in:${input.length}, out:${output.length})`;

        console.log(`${inputDisplay} → ${outputDisplay} ${lengths}`);
        expect(output).toMatch(expected);
      });

      console.log('─'.repeat(50));
    });
  });
});
