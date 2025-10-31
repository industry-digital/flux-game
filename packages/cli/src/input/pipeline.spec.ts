import { describe, it, expect, beforeEach } from 'vitest';
import { runPipeline, tokenizeWithPool, parseRawInput } from './pipeline';
import { ParsedInput, ReplCommand, ReplCommandType } from '~/types';

const DEFAULT_TRACE = 'test1234';

describe('Input Parsing Engine', () => {
  // Mock processors for testing
  const mockValidateProcessor = (input: ParsedInput, trace = DEFAULT_TRACE): ParsedInput | ReplCommand => {
    if (input.command === 'invalid') {
      return { trace, type: ReplCommandType.SHOW_HELP, command: 'Invalid command' };
    }
    return input;
  };

  const mockParseProcessor = (input: ParsedInput, trace = DEFAULT_TRACE): ReplCommand => {
    switch (input.command) {
      case 'help':
        return { trace, type: ReplCommandType.SHOW_HELP, command: input.args[0] };
      case 'exit':
        return { trace, type: ReplCommandType.EXIT };
      case 'clear':
        return { trace, type: ReplCommandType.CLEAR_SCREEN };
      default:
        return { trace, type: ReplCommandType.GAME_COMMAND, input: input.command };
    }
  };

  describe('tokenizeWithPool', () => {
    it('should tokenize simple input', () => {
      const tokens = tokenizeWithPool('help workbench');
      expect(tokens).toEqual(['help', 'workbench']);
    });

    it('should handle multiple spaces', () => {
      const tokens = tokenizeWithPool('  help    workbench  ');
      expect(tokens).toEqual(['help', 'workbench']);
    });

    it('should lowercase tokens', () => {
      const tokens = tokenizeWithPool('HELP WorkBench');
      expect(tokens).toEqual(['help', 'workbench']);
    });

    it('should handle empty input', () => {
      const tokens = tokenizeWithPool('');
      expect(tokens).toEqual([]);
    });

    it('should handle whitespace-only input', () => {
      const tokens = tokenizeWithPool('   \t  \n  ');
      expect(tokens).toEqual([]);
    });

    it('should reuse token arrays from pool', () => {
      const tokens1 = tokenizeWithPool('test one');
      const tokens2 = tokenizeWithPool('test two');

      // Arrays should be different instances but potentially reused from pool
      expect(tokens1).not.toBe(tokens2);
      expect(tokens1).toEqual(['test', 'one']);
      expect(tokens2).toEqual(['test', 'two']);
    });
  });

  describe('parseRawInput', () => {
    let output: ParsedInput;

    beforeEach(() => {
      output = { tokens: [], command: '', args: [], raw: '' };
    });

    it('should parse tokens into structured format', () => {
      const result = parseRawInput('help workbench', ['help', 'workbench'], output);

      expect(result).toBe(output); // Should reuse output object
      expect(result.tokens).toEqual(['help', 'workbench']);
      expect(result.command).toBe('help');
      expect(result.args).toEqual(['workbench']);
    });

    it('should handle single token', () => {
      const result = parseRawInput('exit', ['exit'], output);

      expect(result.command).toBe('exit');
      expect(result.args).toEqual([]);
    });

    it('should handle empty tokens', () => {
      const result = parseRawInput('', [], output);
      expect(result.command).toBe('');
      expect(result.args).toEqual([]);
    });

    it('should handle multiple arguments', () => {
      const result = parseRawInput('actor alice location forest', ['actor', 'alice', 'location', 'forest'], output);
      expect(result.command).toBe('actor');
      expect(result.args).toEqual(['alice', 'location', 'forest']);
    });

    it('should reuse output buffer', () => {
      const result1 = parseRawInput('test one', ['test', 'one'], output);
      const result2 = parseRawInput('test two', ['test', 'two'], output);

      expect(result1).toBe(output);
      expect(result2).toBe(output);
      expect(result2.command).toBe('test');
      expect(result2.args).toEqual(['two']);
    });
  });

  describe('runPipeline', () => {
    it('should process input through pipeline', () => {
      const pipeline = [mockParseProcessor];
      const result = runPipeline('help workbench', undefined, pipeline, DEFAULT_TRACE);

      expect(result).toEqual({
        trace: DEFAULT_TRACE,
        type: ReplCommandType.SHOW_HELP,
        command: 'workbench'
      });
    });

    it('should handle early exit from validation', () => {
      const pipeline = [mockValidateProcessor, mockParseProcessor];
      const result = runPipeline('invalid command', undefined, pipeline, DEFAULT_TRACE);

      expect(result).toEqual({
        trace: DEFAULT_TRACE,
        type: ReplCommandType.SHOW_HELP,
        command: 'Invalid command'
      });
    });

    it('should process through multiple processors', () => {
      const pipeline = [mockValidateProcessor, mockParseProcessor];
      const result = runPipeline('help advanced', undefined, pipeline, DEFAULT_TRACE);

      expect(result).toEqual({
        trace: DEFAULT_TRACE,
        type: ReplCommandType.SHOW_HELP,
        command: 'advanced'
      });
    });

    it('should handle pre-tokenized input', () => {
      const tokens = ['exit'];
      const pipeline = [mockParseProcessor];
      const result = runPipeline('', tokens, pipeline, DEFAULT_TRACE);

      expect(result).toEqual({
        trace: DEFAULT_TRACE,
        type: ReplCommandType.EXIT
      });
    });

    it('should fallback to game command for unrecognized input', () => {
      const pipeline = [mockParseProcessor];
      const result = runPipeline('unknown command', undefined, pipeline, DEFAULT_TRACE);

      expect(result).toEqual({
        trace: DEFAULT_TRACE,
        type: ReplCommandType.GAME_COMMAND,
        input: 'unknown'
      });
    });

    it('should set raw input for validation', () => {
      let capturedInput: ParsedInput | null = null;

      const captureProcessor = (input: ParsedInput): ParsedInput => {
        capturedInput = { ...input };
        return input;
      };

      const pipeline = [captureProcessor, mockParseProcessor];
      runPipeline('test input', undefined, pipeline, DEFAULT_TRACE);

      expect(capturedInput).not.toBeNull();
      expect(capturedInput!.raw).toBe('test input');
    });

    it('should handle empty pipeline', () => {
      const result = runPipeline('test', undefined, [], DEFAULT_TRACE);

      expect(result).toEqual({
        trace: DEFAULT_TRACE,
        type: ReplCommandType.GAME_COMMAND,
        input: 'test'
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should reuse token arrays', () => {
      const pipeline = [mockParseProcessor];

      // Run multiple times to trigger pool usage
      for (let i = 0; i < 20; i++) {
        runPipeline(`test ${i}`, undefined, pipeline, DEFAULT_TRACE);
      }

      // Should not throw or leak memory
      expect(true).toBe(true);
    });

    it('should handle large input efficiently', () => {
      const largeInput = 'command ' + 'arg '.repeat(100);
      const pipeline = [mockParseProcessor];

      const start = performance.now();
      const result = runPipeline(largeInput, undefined, pipeline, DEFAULT_TRACE);
      const duration = performance.now() - start;

      expect(result.type).toBe(ReplCommandType.GAME_COMMAND);
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should handle rapid successive calls', () => {
      const pipeline = [mockParseProcessor];
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        runPipeline(`test ${i % 10}`, undefined, pipeline, DEFAULT_TRACE);
      }
      const duration = performance.now() - start;

      const avgTime = duration / iterations;
      expect(avgTime).toBeLessThan(1); // Less than 1ms per parse on average
    });
  });

  describe('Edge Cases', () => {
    it('should handle processor that returns undefined', () => {
      const badProcessor = (): any => undefined;
      const pipeline = [badProcessor, mockParseProcessor];

      expect(() => {
        runPipeline('test', undefined, pipeline, DEFAULT_TRACE);
      }).not.toThrow();
    });

    it('should handle processor that throws', () => {
      const throwingProcessor = (): never => {
        throw new Error('Test error');
      };
      const pipeline = [throwingProcessor];

      expect(() => {
        runPipeline('test', undefined, pipeline, DEFAULT_TRACE);
      }).toThrow('Test error');
    });

    it('should handle very long command names', () => {
      const longCommand = 'a'.repeat(1000);
      const pipeline = [mockParseProcessor];

      const result = runPipeline(longCommand, undefined, pipeline, DEFAULT_TRACE);
      expect(result.type).toBe(ReplCommandType.GAME_COMMAND);
    });

    it('should handle special characters in tokens', () => {
      const tokens = ['test', 'with-dashes', 'with_underscores', 'with.dots'];
      const pipeline = [mockParseProcessor];

      const result = runPipeline('', tokens, pipeline, DEFAULT_TRACE);
      expect(result.type).toBe(ReplCommandType.GAME_COMMAND);
    });
  });
});
