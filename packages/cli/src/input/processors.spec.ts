import { describe, it, expect } from 'vitest';
import {
  validateSecurity,
  parseCommand,
  fallbackToGameCommand,
  BASIC_PIPELINE,
  DEFAULT_PIPELINE
} from './processors';
import { ParsedInput, ReplCommand, ReplCommandType } from '../types';
import { ActorURN } from '@flux/core';

const DEFAULT_TRACE = 'test-trace-123';

describe('Input Processors', () => {
  describe('validateSecurity', () => {
    it('should pass through safe input unchanged', () => {
      const input: ParsedInput = {
        raw: 'help commands',
        tokens: ['help', 'commands'],
        command: 'help',
        args: ['commands']
      };

      const result = validateSecurity(input, DEFAULT_TRACE);
      expect(result).toBe(input);
    });

    it('should pass through input without raw field', () => {
      const input: ParsedInput = {
        raw: '',
        tokens: ['help'],
        command: 'help',
        args: []
      };

      const result = validateSecurity(input, DEFAULT_TRACE);
      expect(result).toBe(input);
    });

    it('should block directory traversal attempts', () => {
      const input: ParsedInput = {
        raw: 'cd ../../../etc/passwd',
        tokens: ['cd', '../../../etc/passwd'],
        command: 'cd',
        args: ['../../../etc/passwd']
      };

      const result = validateSecurity(input, DEFAULT_TRACE);
      expect(result).toEqual({
        type: ReplCommandType.SHOW_HELP,
        command: 'security',
        trace: DEFAULT_TRACE
      });
    });

    it('should block shell injection characters', () => {
      const dangerousInputs = [
        'command < /etc/passwd',
        'command > /tmp/output',
        'command | grep secret',
        'command & background',
        'command ; rm -rf /',
        'command `whoami`',
        'command $USER'
      ];

      dangerousInputs.forEach(rawInput => {
        const input: ParsedInput = {
          raw: rawInput,
          tokens: rawInput.split(' '),
          command: rawInput.split(' ')[0],
          args: rawInput.split(' ').slice(1)
        };

        const result = validateSecurity(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_HELP,
          command: 'security',
          trace: DEFAULT_TRACE
        });
      });
    });

    it('should block code evaluation attempts', () => {
      const codeInjectionInputs = [
        'eval(alert("xss"))',
        'eval (malicious_code)',
        'require("fs").readFileSync("/etc/passwd")',
        'require ("child_process")',
        'import fs from "fs"',
        'import * as os from "os"'
      ];

      codeInjectionInputs.forEach(rawInput => {
        const input: ParsedInput = {
          raw: rawInput,
          tokens: [rawInput],
          command: rawInput,
          args: []
        };

        const result = validateSecurity(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_HELP,
          command: 'security',
          trace: DEFAULT_TRACE
        });
      });
    });

    it('should allow safe commands that contain blocked substrings in safe contexts', () => {
      // These should pass because the patterns are more specific
      const safeInputs = [
        'help evaluation', // contains "eval" but not "eval("
        'show requirements', // contains "require" but not "require("
        'list imports' // contains "import" but not "import "
      ];

      safeInputs.forEach(rawInput => {
        const input: ParsedInput = {
          raw: rawInput,
          tokens: rawInput.split(' '),
          command: rawInput.split(' ')[0],
          args: rawInput.split(' ').slice(1)
        };

        const result = validateSecurity(input, DEFAULT_TRACE);
        expect(result).toBe(input);
      });
    });
  });

  describe('parseCommand', () => {
    describe('help command', () => {
      it('should handle help command with topic', () => {
        const input: ParsedInput = {
          raw: 'help actors',
          tokens: ['help', 'actors'],
          command: 'help',
          args: ['actors']
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_HELP,
          command: 'actors',
          trace: DEFAULT_TRACE
        });
      });

      it('should handle help command without topic', () => {
        const input: ParsedInput = {
          raw: 'help',
          tokens: ['help'],
          command: 'help',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_HELP,
          command: undefined,
          trace: DEFAULT_TRACE
        });
      });

      it('should handle help alias "h"', () => {
        const input: ParsedInput = {
          raw: 'h commands',
          tokens: ['h', 'commands'],
          command: 'h',
          args: ['commands']
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_HELP,
          command: 'commands',
          trace: DEFAULT_TRACE
        });
      });

      it('should handle case insensitive help commands', () => {
        const input: ParsedInput = {
          raw: 'HELP',
          tokens: ['HELP'],
          command: 'HELP',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_HELP,
          command: undefined,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('actor command', () => {
      it('should switch actor with valid ID', () => {
        const input: ParsedInput = {
          raw: 'actor alice',
          tokens: ['actor', 'alice'],
          command: 'actor',
          args: ['alice']
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SWITCH_ACTOR,
          actorId: 'alice' as ActorURN,
          trace: DEFAULT_TRACE
        });
      });

      it('should handle actor alias "a"', () => {
        const input: ParsedInput = {
          raw: 'a bob',
          tokens: ['a', 'bob'],
          command: 'a',
          args: ['bob']
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SWITCH_ACTOR,
          actorId: 'bob' as ActorURN,
          trace: DEFAULT_TRACE
        });
      });

      it('should show help when actor ID is missing', () => {
        const input: ParsedInput = {
          raw: 'actor',
          tokens: ['actor'],
          command: 'actor',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_HELP,
          command: 'actor',
          trace: DEFAULT_TRACE
        });
      });

      it('should handle case insensitive actor commands', () => {
        const input: ParsedInput = {
          raw: 'ACTOR charlie',
          tokens: ['ACTOR', 'charlie'],
          command: 'ACTOR',
          args: ['charlie']
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SWITCH_ACTOR,
          actorId: 'charlie' as ActorURN,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('context command', () => {
      it('should handle context command', () => {
        const input: ParsedInput = {
          raw: 'context',
          tokens: ['context'],
          command: 'context',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_CONTEXT,
          trace: DEFAULT_TRACE
        });
      });

      it('should handle context alias "ctx"', () => {
        const input: ParsedInput = {
          raw: 'ctx',
          tokens: ['ctx'],
          command: 'ctx',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_CONTEXT,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('events command', () => {
      it('should handle events command', () => {
        const input: ParsedInput = {
          raw: 'events',
          tokens: ['events'],
          command: 'events',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_EVENTS,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('errors command', () => {
      it('should handle errors command', () => {
        const input: ParsedInput = {
          raw: 'errors',
          tokens: ['errors'],
          command: 'errors',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_ERRORS,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('handlers command', () => {
      it('should handle handlers command', () => {
        const input: ParsedInput = {
          raw: 'handlers',
          tokens: ['handlers'],
          command: 'handlers',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_HANDLERS,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('sessions command', () => {
      it('should handle sessions command', () => {
        const input: ParsedInput = {
          raw: 'sessions',
          tokens: ['sessions'],
          command: 'sessions',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SHOW_SESSIONS,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('clear command', () => {
      it('should handle clear command', () => {
        const input: ParsedInput = {
          raw: 'clear',
          tokens: ['clear'],
          command: 'clear',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.CLEAR_SCREEN,
          trace: DEFAULT_TRACE
        });
      });

      it('should handle clear alias "cls"', () => {
        const input: ParsedInput = {
          raw: 'cls',
          tokens: ['cls'],
          command: 'cls',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.CLEAR_SCREEN,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('exit command', () => {
      it('should handle exit command', () => {
        const input: ParsedInput = {
          raw: 'exit',
          tokens: ['exit'],
          command: 'exit',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.EXIT,
          trace: DEFAULT_TRACE
        });
      });

      it('should handle quit alias', () => {
        const input: ParsedInput = {
          raw: 'quit',
          tokens: ['quit'],
          command: 'quit',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.EXIT,
          trace: DEFAULT_TRACE
        });
      });

      it('should handle "q" alias', () => {
        const input: ParsedInput = {
          raw: 'q',
          tokens: ['q'],
          command: 'q',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.EXIT,
          trace: DEFAULT_TRACE
        });
      });
    });

    describe('unrecognized commands', () => {
      it('should pass through unrecognized commands unchanged', () => {
        const input: ParsedInput = {
          raw: 'look around',
          tokens: ['look', 'around'],
          command: 'look',
          args: ['around']
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toBe(input);
      });

      it('should pass through game commands unchanged', () => {
        const input: ParsedInput = {
          raw: 'attack goblin with sword',
          tokens: ['attack', 'goblin', 'with', 'sword'],
          command: 'attack',
          args: ['goblin', 'with', 'sword']
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toBe(input);
      });
    });

    describe('edge cases', () => {
      it('should handle empty command', () => {
        const input: ParsedInput = {
          raw: '',
          tokens: [],
          command: '',
          args: []
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toBe(input);
      });

      it('should handle commands with extra whitespace in args', () => {
        const input: ParsedInput = {
          raw: 'actor   alice   bob',
          tokens: ['actor', 'alice', 'bob'],
          command: 'actor',
          args: ['alice', 'bob']
        };

        const result = parseCommand(input, DEFAULT_TRACE);
        expect(result).toEqual({
          type: ReplCommandType.SWITCH_ACTOR,
          actorId: 'alice' as ActorURN,
          trace: DEFAULT_TRACE
        });
      });
    });
  });

  describe('fallbackToGameCommand', () => {
    it('should convert ParsedInput to game command', () => {
      const input: ParsedInput = {
        raw: 'look at the mysterious door',
        tokens: ['look', 'at', 'the', 'mysterious', 'door'],
        command: 'look',
        args: ['at', 'the', 'mysterious', 'door']
      };

      const result = fallbackToGameCommand(input, DEFAULT_TRACE);
      expect(result).toEqual({
        type: ReplCommandType.GAME_COMMAND,
        input: 'look at the mysterious door',
        trace: DEFAULT_TRACE
      });
    });

    it('should handle single token input', () => {
      const input: ParsedInput = {
        raw: 'inventory',
        tokens: ['inventory'],
        command: 'inventory',
        args: []
      };

      const result = fallbackToGameCommand(input, DEFAULT_TRACE);
      expect(result).toEqual({
        type: ReplCommandType.GAME_COMMAND,
        input: 'inventory',
        trace: DEFAULT_TRACE
      });
    });

    it('should handle empty input', () => {
      const input: ParsedInput = {
        raw: '',
        tokens: [],
        command: '',
        args: []
      };

      const result = fallbackToGameCommand(input, DEFAULT_TRACE);
      expect(result).toEqual({
        type: ReplCommandType.GAME_COMMAND,
        input: '',
        trace: DEFAULT_TRACE
      });
    });

    it('should preserve original token spacing', () => {
      const input: ParsedInput = {
        raw: 'say "hello world" to alice',
        tokens: ['say', '"hello', 'world"', 'to', 'alice'],
        command: 'say',
        args: ['"hello', 'world"', 'to', 'alice']
      };

      const result = fallbackToGameCommand(input, DEFAULT_TRACE);
      expect(result).toEqual({
        type: ReplCommandType.GAME_COMMAND,
        input: 'say "hello world" to alice',
        trace: DEFAULT_TRACE
      });
    });
  });

  describe('Pipeline Constants', () => {
    describe('BASIC_PIPELINE', () => {
      it('should contain parseCommand and fallbackToGameCommand in correct order', () => {
        expect(BASIC_PIPELINE).toEqual([
          parseCommand,
          fallbackToGameCommand
        ]);
      });

      it('should be readonly', () => {
        // TypeScript compile-time check - this should not allow modification
        expect(BASIC_PIPELINE.length).toBe(2);
      });
    });

    describe('DEFAULT_PIPELINE', () => {
      it('should contain security validation followed by basic pipeline', () => {
        expect(DEFAULT_PIPELINE).toEqual([
          validateSecurity,
          parseCommand,
          fallbackToGameCommand
        ]);
      });

      it('should be readonly', () => {
        // TypeScript compile-time check
        expect(DEFAULT_PIPELINE.length).toBe(3);
      });

      it('should include validateSecurity as first processor', () => {
        expect(DEFAULT_PIPELINE[0]).toBe(validateSecurity);
      });

      it('should include BASIC_PIPELINE processors after security', () => {
        expect(DEFAULT_PIPELINE.slice(1)).toEqual([...BASIC_PIPELINE]);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should process secure command through full pipeline', () => {
      const input: ParsedInput = {
        raw: 'help actors',
        tokens: ['help', 'actors'],
        command: 'help',
        args: ['actors']
      };

      // Simulate pipeline processing
      let current: ParsedInput | ReplCommand = input;

      for (const processor of DEFAULT_PIPELINE) {
        if ('type' in current) break;
        current = processor(current, DEFAULT_TRACE);
      }

      expect(current).toEqual({
        type: ReplCommandType.SHOW_HELP,
        command: 'actors',
        trace: DEFAULT_TRACE
      });
    });

    it('should block dangerous input in full pipeline', () => {
      const input: ParsedInput = {
        raw: 'help ../../../etc/passwd',
        tokens: ['help', '../../../etc/passwd'],
        command: 'help',
        args: ['../../../etc/passwd']
      };

      let current: ParsedInput | ReplCommand = input;

      for (const processor of DEFAULT_PIPELINE) {
        if ('type' in current) break;
        current = processor(current, DEFAULT_TRACE);
      }

      expect(current).toEqual({
        type: ReplCommandType.SHOW_HELP,
        command: 'security',
        trace: DEFAULT_TRACE
      });
    });

    it('should convert unrecognized command to game command', () => {
      const input: ParsedInput = {
        raw: 'cast fireball at dragon',
        tokens: ['cast', 'fireball', 'at', 'dragon'],
        command: 'cast',
        args: ['fireball', 'at', 'dragon']
      };

      let current: ParsedInput | ReplCommand = input;

      for (const processor of DEFAULT_PIPELINE) {
        if ('type' in current) break;
        current = processor(current, DEFAULT_TRACE);
      }

      expect(current).toEqual({
        type: ReplCommandType.GAME_COMMAND,
        input: 'cast fireball at dragon',
        trace: DEFAULT_TRACE
      });
    });
  });
});
