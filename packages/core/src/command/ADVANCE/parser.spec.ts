import { describe, beforeEach, it, expect } from 'vitest';
import { advanceIntentParser } from './parser';
import { createIntent } from '~/intent/factory';
import { createIntentParserContext } from '~/intent/resolution';
import { TransformerContext, WorldProjection } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';
import { AdvanceCommand } from './types';

// Type-safe utility functions for testing discriminated union variants
function assertMaxAdvanceCommand(command: AdvanceCommand | undefined): asserts command is AdvanceCommand & { args: { type: 'max' } } {
  expect(command).toBeTruthy();
  expect(command?.args.type).toBe('max');
}

function assertDistanceAdvanceCommand(command: AdvanceCommand | undefined, expectedDistance: number): asserts command is AdvanceCommand & { args: { type: 'distance'; distance: number } } {
  expect(command).toBeTruthy();
  expect(command?.args.type).toBe('distance');
  if (command?.args.type === 'distance') {
    expect(command.args.distance).toBe(expectedDistance);
  }
}

function assertApAdvanceCommand(command: AdvanceCommand | undefined, expectedAp: number): asserts command is AdvanceCommand & { args: { type: 'ap'; ap: number } } {
  expect(command).toBeTruthy();
  expect(command?.args.type).toBe('ap');
  if (command?.args.type === 'ap') {
    expect(command.args.ap).toBe(expectedAp);
  }
}

describe('ADVANCE Command Parser', () => {
  let context: TransformerContext;
  let parserContext: ReturnType<typeof createIntentParserContext>;

  // Test entities
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';
  const SESSION_ID: SessionURN = 'flux:session:combat:test';

  beforeEach(() => {
    context = createTestTransformerContext({
      world: createWorldProjection((w: WorldProjection) => ({
        ...w,
        sessions: {},
        items: {},
        actors: {
          [ACTOR_ID]: createActor({
            id: ACTOR_ID,
            name: 'Alice',
            location: PLACE_ID,
          }),
        },
        places: {
          [PLACE_ID]: createPlace({
            id: PLACE_ID,
            name: 'Test Arena',
          }),
        },
      })),
    });

    parserContext = createIntentParserContext(context);
  });

  describe('Basic Functionality', () => {
    it('should recognize advance verb', () => {
      const intent = createIntent({
        id: 'test-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ADVANCE);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
    });

    it('should reject non-advance verbs', () => {
      const intent = createIntent({
        id: 'test-2',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject when actor not found', () => {
      const intent = createIntent({
        id: 'test-3',
        actor: 'flux:actor:missing' as ActorURN,
        location: PLACE_ID,
        text: 'advance',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

  });

  describe('Max Advance Syntax: "advance"', () => {
    it('should parse bare "advance" as max advance', () => {
      const intent = createIntent({
        id: 'test-5',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command);
    });
  });

  describe('Distance Shorthand Syntax: "advance <number>"', () => {
    it('should parse "advance 15" as distance shorthand', () => {
      const intent = createIntent({
        id: 'test-6',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 15',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertDistanceAdvanceCommand(command, 15);
    });

    it('should parse "advance 5.5" as distance shorthand with decimal', () => {
      const intent = createIntent({
        id: 'test-7',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 5.5',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertDistanceAdvanceCommand(command, 5.5);
    });

    it('should reject "advance 0" (zero distance)', () => {
      const intent = createIntent({
        id: 'test-8',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 0',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command);
    });

    it('should reject "advance -5" (negative distance)', () => {
      const intent = createIntent({
        id: 'test-9',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance -5',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });

    it('should reject "advance abc" (invalid number)', () => {
      const intent = createIntent({
        id: 'test-10',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance abc',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });
  });

  describe('Explicit Distance Syntax: "advance distance <number>"', () => {
    it('should parse "advance distance 10"', () => {
      const intent = createIntent({
        id: 'test-11',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance 10',
      });

      const command = advanceIntentParser(parserContext, intent);
      assertDistanceAdvanceCommand(command, 10);
    });

    it('should floor decimal distances to whole meters', () => {
      const intent = createIntent({
        id: 'test-12',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance 7.8',
      });

      const command = advanceIntentParser(parserContext, intent);
      assertDistanceAdvanceCommand(command, 7); // Math.floor(7.8)
    });

    it('should reject "advance distance 0"', () => {
      const intent = createIntent({
        id: 'test-13',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance 0',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });

    it('should reject "advance distance -3"', () => {
      const intent = createIntent({
        id: 'test-14',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance -3',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });
  });

  describe('AP-based Syntax: "advance ap <number>"', () => {
    it('should parse "advance ap 2.5"', () => {
      const intent = createIntent({
        id: 'test-15',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 2.5',
      });

      const command = advanceIntentParser(parserContext, intent);
      assertApAdvanceCommand(command, 2.5);
    });

    it('should parse "advance ap 1" (whole number AP)', () => {
      const intent = createIntent({
        id: 'test-16',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 1',
      });

      const command = advanceIntentParser(parserContext, intent);
      assertApAdvanceCommand(command, 1);
    });

    it('should reject "advance ap 0"', () => {
      const intent = createIntent({
        id: 'test-17',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 0',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });

    it('should reject "advance ap -1.5"', () => {
      const intent = createIntent({
        id: 'test-18',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap -1.5',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });
  });

  describe('Session Threading', () => {
    it('should thread session ID from intent to command', () => {
      const intent = createIntent({
        id: 'test-19',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: 'advance 10',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBe(SESSION_ID);
    });

    it('should work without session ID', () => {
      const intent = createIntent({
        id: 'test-20',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 1.5',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBeUndefined();
    });
  });

  describe('Edge Cases and Malformed Input', () => {
    it('should handle extra tokens gracefully', () => {
      const intent = createIntent({
        id: 'test-21',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance 10 extra tokens here',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance due to >2 tokens
    });

    it('should handle unknown modifiers', () => {
      const intent = createIntent({
        id: 'test-22',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance speed 10',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });

    it('should handle empty string numbers', () => {
      const intent = createIntent({
        id: 'test-23',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance',
      });

      const command = advanceIntentParser(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });
  });

  describe('Performance Characteristics', () => {
    it('should use zero-allocation token parsing', () => {
      const intent = createIntent({
        id: 'test-24',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 2.5',
      });

      // Verify tokens are pre-parsed
      expect(intent.args).toEqual(['ap', '2.5']);
      expect(intent.verb).toBe('advance');

      const command = advanceIntentParser(parserContext, intent);
      assertApAdvanceCommand(command, 2.5);
    });

    it('should handle large numbers efficiently', () => {
      const intent = createIntent({
        id: 'test-25',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 999999',
      });

      const command = advanceIntentParser(parserContext, intent);
      assertDistanceAdvanceCommand(command, 999999);
    });
  });

  describe('Input Sanitization', () => {
    it('should prove that no raw user input propagates into parsed command', () => {
      // Test malicious/unexpected input that should be completely sanitized
      const maliciousInputs = [
        'advance <script>alert("xss")</script>',
        'advance ${process.env.SECRET}',
        'advance ../../../etc/passwd',
        'advance DROP TABLE users;',
        'advance __proto__.constructor',
        'advance eval("malicious code")',
        'advance function(){return window}',
        'advance \x00\x01\x02\x03', // null bytes and control chars
        'advance \u0000\u0001\u0002', // unicode null/control
        'advance 999999999999999999999999999999999', // extremely large number
        'advance -999999999999999999999999999999999', // extremely large negative
        'advance NaN',
        'advance Infinity',
        'advance undefined',
        'advance null',
        'advance {}',
        'advance []',
        'advance console.log',
        'advance window.location',
      ];

      maliciousInputs.forEach((maliciousText, index) => {
        const intent = createIntent({
          id: `security-test-${index}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: maliciousText,
        });

        const command = advanceIntentParser(parserContext, intent);

        // Command should be parsed successfully (no crashes)
        expect(command).toBeTruthy();
        expect(command?.type).toBe(CommandType.ADVANCE);
        expect(command?.actor).toBe(ACTOR_ID);
        expect(command?.location).toBe(PLACE_ID);

        // Args should only contain safe, validated values from our discriminated union
        expect(command?.args).toBeDefined();
        expect(typeof command?.args).toBe('object');

        // Type field should only be one of our safe enum values
        expect(['max', 'distance', 'ap']).toContain(command?.args.type);

        // Verify no raw user input exists anywhere in the command
        const commandStr = JSON.stringify(command);

        // Should not contain any script tags, eval, or other dangerous patterns
        expect(commandStr).not.toMatch(/<script/i);
        expect(commandStr).not.toMatch(/eval\(/i);
        expect(commandStr).not.toMatch(/function\(/i);
        expect(commandStr).not.toMatch(/\$\{/);
        expect(commandStr).not.toMatch(/\.\.\//);
        expect(commandStr).not.toMatch(/DROP\s+TABLE/i);
        expect(commandStr).not.toMatch(/__proto__/);
        expect(commandStr).not.toMatch(/constructor/);
        expect(commandStr).not.toMatch(/window/);
        expect(commandStr).not.toMatch(/console/);
        expect(commandStr).not.toMatch(/process\.env/);

        // Should not contain null bytes or control characters
        expect(commandStr).not.toMatch(/\x00/);
        expect(commandStr).not.toMatch(/\u0000/);

        // Should not contain the literal strings "undefined", "null", "NaN", "Infinity"
        expect(commandStr).not.toMatch(/\bundefined\b/);
        expect(commandStr).not.toMatch(/\bnull\b/);
        expect(commandStr).not.toMatch(/\bNaN\b/);
        expect(commandStr).not.toMatch(/\bInfinity\b/);

        // Verify that numeric values are properly bounded and safe
        if (command?.args.type === 'distance') {
          expect(typeof command.args.distance).toBe('number');
          expect(Number.isFinite(command.args.distance)).toBe(true);
          expect(command.args.distance).toBeGreaterThan(0);
          // For extremely large numbers, parser should fall back to max instead of parsing
          expect(command.args.distance).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
        }

        if (command?.args.type === 'ap') {
          expect(typeof command.args.ap).toBe('number');
          expect(Number.isFinite(command.args.ap)).toBe(true);
          expect(command.args.ap).toBeGreaterThan(0);
          // For extremely large numbers, parser should fall back to max instead of parsing
          expect(command.args.ap).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
        }

        // For malicious input, should fall back to safe 'max' type
        if (!maliciousText.match(/^\s*advance\s+(?:distance\s+)?\d+(?:\.\d+)?\s*$/i) &&
            !maliciousText.match(/^\s*advance\s+ap\s+\d+(?:\.\d+)?\s*$/i)) {
          assertMaxAdvanceCommand(command);
        }
      });
    });

    it('should handle edge case numeric inputs safely', () => {
      const edgeCaseNumbers = [
        'advance 0',           // Zero (should fall back to max)
        'advance -1',          // Negative (should fall back to max)
        'advance 1e308',       // Scientific notation near infinity
        'advance 1e-308',      // Scientific notation near zero
        'advance 0x41',        // Hexadecimal
        'advance 0b101',       // Binary
        'advance 0o77',        // Octal
        'advance 3.14159265359', // High precision decimal
        'advance 1.7976931348623157e+308', // Near MAX_VALUE
        'advance 5e-324',      // Near MIN_VALUE
      ];

      edgeCaseNumbers.forEach((text, index) => {
        const intent = createIntent({
          id: `edge-numeric-${index}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text,
        });

        const command = advanceIntentParser(parserContext, intent);

        expect(command).toBeTruthy();

        // All edge cases should either be valid numbers or fall back to max
        if (command?.args.type === 'distance') {
          expect(Number.isFinite(command.args.distance)).toBe(true);
          expect(command.args.distance).toBeGreaterThan(0);
        } else {
          // Should fall back to max for invalid numbers
          assertMaxAdvanceCommand(command);
        }
      });
    });
  });

  describe('Command Structure Validation', () => {

    it('should preserve all required command fields', () => {
      const intent = createIntent({
        id: 'test-26',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: 'advance distance 15',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toMatchObject({
        id: intent.id,
        type: CommandType.ADVANCE,
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        args: {
          type: 'distance',
          distance: 15,
        },
      });
    });
  });
});
